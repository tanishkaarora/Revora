# backend/app/revora/diagnosis/engine.py

from typing import Tuple, Dict, Any
from app.guardrail.types import FailedPayment, Diagnosis, FailureCause
from app.revora.diagnosis.error_code_map import lookup_error_cause

from app.llm import get_llm_provider

class DiagnosisEngine:
    def __init__(self):
        self.llm_provider = get_llm_provider()

    def diagnose(self, payment: FailedPayment) -> Diagnosis:
        # Step 1: Rule-based lookup
        cause = lookup_error_cause(payment.error_code, payment.error_reason)
        if cause:
            return Diagnosis(
                failed_payment_id=payment.id,
                cause=cause,
                confidence=1.0,
                source="rule",
                evidence={"matched_code": payment.error_code, "matched_reason": payment.error_reason}
            )
            
        # Step 2: Fast keyword classification
        from app.llm.fallback_keywords import fallback_classify_failure_cause
        fb_cause, fb_conf = fallback_classify_failure_cause(payment.error_code, payment.error_reason)
        if fb_cause != "unknown":
            return Diagnosis(
                failed_payment_id=payment.id,
                cause=fb_cause,
                confidence=fb_conf,
                source="rule",
                evidence={"keyword_matched": True}
            )

        # Step 3: Fallback to LLM
        try:
            llm_cause, llm_confidence = self.llm_provider.classify_failure_cause(
                payment.error_code, payment.error_reason
            )
            return Diagnosis(
                failed_payment_id=payment.id,
                cause=llm_cause,
                confidence=llm_confidence,
                source="llm_fallback",
                evidence={"llm_reasoning": "Error signature classified by LLM fallback"}
            )
        except Exception as e:
            # Absolute fallback in case LLM provider completely crashes
            return Diagnosis(
                failed_payment_id=payment.id,
                cause="unknown",
                confidence=0.5,
                source="llm_fallback",
                evidence={"degradation_error": str(e), "classification_defaulted": True}
            )
