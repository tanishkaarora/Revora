# backend/app/llm/gemini_provider.py
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional
import google.generativeai as genai
from app.llm.base import LLMProvider
from app.guardrail.types import FailureCause
from app.llm.fallback_keywords import (
    fallback_extract_commitment,
    fallback_classify_failure_cause,
    fallback_generate_hinglish_message
)

logger = logging.getLogger(__name__)

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.configured = False
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.configured = True
            except Exception as e:
                logger.error(f"Failed to configure Gemini SDK: {e}")

    def _call_gemini_json(self, prompt: str, system_prompt: str = "") -> Optional[dict]:
        if not self.configured:
            return None
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config={"response_mime_type": "application/json"},
                system_instruction=system_prompt
            )
            response = model.generate_content(prompt)
            if response.text:
                return json.loads(response.text)
        except Exception as e:
            logger.warning(f"Gemini API call failed, using graceful fallback: {e}")
        return None

    def _call_gemini_text(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.configured:
            return None
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                system_instruction=system_prompt
            )
            response = model.generate_content(prompt)
            if response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini API call failed, using graceful fallback: {e}")
        return None

    def classify_failure_cause(self, error_code: str, error_reason: str) -> Tuple[FailureCause, float]:
        if not self.configured:
            return fallback_classify_failure_cause(error_code, error_reason)

        system_prompt = (
            "You are a payment classification model. You must return a JSON object with exactly two keys: "
            "'cause' and 'confidence'. The 'cause' must be one of: 'bank_timeout', 'insufficient_balance', "
            "'expired_mandate', 'wrong_otp', 'card_declined', 'unknown'. The 'confidence' must be a float between 0.0 and 1.0."
        )
        prompt = f"Classify this payment failure:\nError Code: {error_code}\nError Reason: {error_reason}"
        
        response_json = self._call_gemini_json(prompt, system_prompt)
        
        if response_json and "cause" in response_json:
            cause = response_json["cause"]
            confidence = float(response_json.get("confidence", 0.8))
            valid_causes = ["bank_timeout", "insufficient_balance", "expired_mandate", "wrong_otp", "card_declined", "unknown"]
            if cause in valid_causes:
                return cause, confidence

        return fallback_classify_failure_cause(error_code, error_reason)

    def generate_hinglish_message(self, customer_name: str, amount_rupees: float, payment_link: str, cause: FailureCause) -> str:
        if not self.configured:
            return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

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
        
        message = self._call_gemini_text(prompt, system_prompt)
        if message:
            return message
            
        return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

    def extract_commitment(self, reply: str) -> Tuple[bool, Optional[str], float]:
        if not self.configured:
            return fallback_extract_commitment(reply)

        system_prompt = (
            "You are a commitment extraction model. Analyze the customer's text message and return a JSON object with "
            "exactly three keys: 'commits' (boolean, true if they promise/commit to pay/retry), "
            "'promised_date' (string formatted as YYYY-MM-DD if they mention a time like 'tomorrow', 'by monday', or 'on 25th', otherwise null), "
            "and 'confidence' (float between 0.0 and 1.0)."
        )
        current_date_str = datetime.now().strftime("%Y-%m-%d")
        prompt = f"Analyze this text message. Current date is {current_date_str}.\nMessage: \"{reply}\""
        
        response_json = self._call_gemini_json(prompt, system_prompt)
        
        if response_json and "commits" in response_json:
            commits = bool(response_json["commits"])
            confidence = float(response_json.get("confidence", 0.8))
            promised_date = response_json.get("promised_date")
            
            if promised_date and len(promised_date) != 10:
                promised_date = None
            return commits, promised_date, confidence

        return fallback_extract_commitment(reply)

