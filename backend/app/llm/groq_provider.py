# backend/app/llm/groq_provider.py
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional
from groq import Groq
from app.llm.base import LLMProvider
from app.guardrail.types import FailureCause
from app.llm.fallback_keywords import (
    fallback_extract_commitment,
    fallback_classify_failure_cause,
    fallback_generate_hinglish_message
)

logger = logging.getLogger(__name__)

class GroqProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.1-8b-instant"):
        self.api_key = api_key
        self.model = model
        self.timeout = 3.0  # short timeout for live demo responsiveness
        self.client = Groq(api_key=self.api_key) if self.api_key else None

    def _call_groq_json(self, prompt: str, system_prompt: str = "") -> Optional[dict]:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.0,
                response_format={"type": "json_object"},
                timeout=self.timeout
            )
            content = response.choices[0].message.content
            if content:
                return json.loads(content)
        except Exception as e:
            logger.warning(f"Groq API JSON call failed, using graceful fallback: {e}")
        return None

    def _call_groq_text(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                timeout=self.timeout
            )
            content = response.choices[0].message.content
            if content:
                return content.strip()
        except Exception as e:
            logger.warning(f"Groq API text call failed, using graceful fallback: {e}")
        return None

    def classify_failure_cause(self, error_code: str, error_reason: str) -> Tuple[FailureCause, float]:
        system_prompt = (
            "You are a payment classification model. You must return a JSON object with exactly two keys: "
            "'cause' and 'confidence'. The 'cause' must be one of: 'bank_timeout', 'insufficient_balance', "
            "'expired_mandate', 'wrong_otp', 'card_declined', 'unknown'. The 'confidence' must be a float between 0.0 and 1.0."
        )
        prompt = f"Classify this payment failure:\nError Code: {error_code}\nError Reason: {error_reason}"
        
        response_json = self._call_groq_json(prompt, system_prompt)
        
        if response_json and "cause" in response_json:
            cause = response_json["cause"]
            confidence = float(response_json.get("confidence", 0.8))
            valid_causes = ["bank_timeout", "insufficient_balance", "expired_mandate", "wrong_otp", "card_declined", "unknown"]
            if cause in valid_causes:
                return cause, confidence

        return fallback_classify_failure_cause(error_code, error_reason)

    def generate_hinglish_message(self, customer_name: str, amount_rupees: float, payment_link: str, cause: FailureCause) -> str:
        system_prompt = (
            "You are Revora, a friendly and helpful revenue recovery assistant. Write a short, single-paragraph "

            "WhatsApp message in friendly conversational Hinglish (Hindi written in English alphabet mixed with English) "
            "to remind the user about their failed payment. Be extremely polite, helpful, and natural, like a customer support agent. "
            "Make sure to include the exact amount and the payment retry link. Do not include any HTML tags, JSON, or placeholders."
        )
        prompt = (
            f"Generate a message for {customer_name}. They had a payment fail for amount ₹{amount_rupees:.2f} due to {cause}. "
            f"Here is the payment link to retry: {payment_link}"
        )
        
        message = self._call_groq_text(prompt, system_prompt)
        if message:
            return message
            
        return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

    def extract_commitment(self, reply: str) -> Tuple[bool, Optional[str], float, str]:
        system_prompt = (
            "You are a customer reply classification model. Analyze the customer's text message and return a JSON object with "
            "exactly four keys: "
            "'outcome' (string: 'commits' if customer commits/promises to pay or retry; 'refuses' if customer refuses to pay, opts out, or asks to stop messaging; 'requests_link' if customer explicitly asks for the payment/retry link; 'ambiguous' otherwise), "
            "'commits' (boolean, true if outcome is 'commits', else false), "
            "'promised_date' (string formatted as YYYY-MM-DD if they mention a time like 'tomorrow', 'by monday', or 'on 25th', otherwise null), "
            "and 'confidence' (float between 0.0 and 1.0)."
        )
        current_date_str = datetime.now().strftime("%Y-%m-%d")
        prompt = f"Analyze this customer text message. Current date is {current_date_str}.\nMessage: \"{reply}\""
        
        response_json = self._call_groq_json(prompt, system_prompt)
        
        if response_json and "commits" in response_json:
            commits = bool(response_json["commits"])
            outcome = response_json.get("outcome")
            if not outcome or outcome not in ["commits", "refuses", "requests_link", "ambiguous"]:
                outcome = "commits" if commits else "ambiguous"
            confidence = float(response_json.get("confidence", 0.8))
            promised_date = response_json.get("promised_date")
            
            if promised_date and len(promised_date) != 10:
                promised_date = None
            return commits, promised_date, confidence, outcome

        return fallback_extract_commitment(reply)
