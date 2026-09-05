# backend/app/revora/execution/commitment_extractor.py

from typing import Tuple, Optional
from app.guardrail.types import Commitment
from app.llm import get_llm_provider
from app.llm.fallback_keywords import fallback_extract_commitment

class CommitmentExtractor:
    def __init__(self):
        self.llm_provider = get_llm_provider()

    def extract_commitment(self, failed_payment_id: str, raw_reply: str) -> Commitment:
        """
        Parses raw text replies to extract promise state or refusal/opt-out status.
        Classifies into: 'commits', 'refuses', or 'ambiguous'.
        """
        try:
            res = self.llm_provider.extract_commitment(raw_reply)
            if len(res) == 4:
                commits, promised_date, confidence, outcome = res
            else:
                commits, promised_date, confidence = res
                outcome = "commits" if commits else "ambiguous"
                
            refuses = (outcome == "refuses")
            requests_link = (outcome == "requests_link")
            return Commitment(
                failed_payment_id=failed_payment_id,
                commits=commits,
                refuses=refuses,
                requests_link=requests_link,
                outcome=outcome,
                promised_date=promised_date,
                confidence=confidence,
                raw_reply=raw_reply
            )
        except Exception:
            # Fallback parsing for resilience
            commits, promised_date, confidence, outcome = fallback_extract_commitment(raw_reply)
            refuses = (outcome == "refuses")
            requests_link = (outcome == "requests_link")
            return Commitment(
                failed_payment_id=failed_payment_id,
                commits=commits,
                refuses=refuses,
                requests_link=requests_link,
                outcome=outcome,
                promised_date=promised_date,
                confidence=confidence,
                raw_reply=raw_reply
            )
        
