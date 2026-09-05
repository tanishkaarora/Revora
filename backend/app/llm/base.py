# backend/app/llm/base.py
from abc import ABC, abstractmethod
from typing import Tuple, Optional
from app.guardrail.types import FailureCause
from app.llm.fallback_keywords import (
    fallback_extract_commitment,
    fallback_classify_failure_cause,
    fallback_generate_hinglish_message
)

class LLMProvider(ABC):
    @abstractmethod
    def classify_failure_cause(self, error_code: str, error_reason: str) -> Tuple[FailureCause, float]:
        """
        Classifies the failed payment's root cause using error text.
        Returns:
            Tuple[FailureCause, confidence_score]
        """
        pass

    @abstractmethod
    def generate_hinglish_message(self, customer_name: str, amount_rupees: float, payment_link: str, cause: FailureCause) -> str:
        """
        Generates a conversational, helpful Hinglish WhatsApp reminder message.
        """
        pass

    @abstractmethod
    def extract_commitment(self, reply: str) -> Tuple[bool, Optional[str], float, str]:
        """
        Parses a customer reply to determine:
        1. Whether they promised/committed to pay (bool)
        2. A target date if specified (YYYY-MM-DD format or None)
        3. Confidence level (float)
        4. Outcome category ("commits" | "refuses" | "ambiguous")
        """
        pass

    def _fallback_classify(self, error_code: str, error_reason: str) -> Tuple[FailureCause, float]:
        """Shared fallback wrapper for payment failure classification."""
        return fallback_classify_failure_cause(error_code, error_reason)

    def _fallback_message(self, customer_name: str, amount_rupees: float, payment_link: str, cause: FailureCause) -> str:
        """Shared fallback wrapper for Hinglish message generation."""
        return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

    def _fallback_commitment(self, reply: str) -> Tuple[bool, Optional[str], float]:
        """Shared fallback wrapper for commitment extraction."""
        commits, p_date, conf, _ = fallback_extract_commitment(reply)
        return commits, p_date, conf
