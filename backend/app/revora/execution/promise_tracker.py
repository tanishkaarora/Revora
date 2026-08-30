# backend/app/revora/execution/promise_tracker.py

import json
from datetime import datetime
from typing import Optional, Dict, Any
from app.audit.store import AuditStore
from app.revora.execution.commitment_extractor import CommitmentExtractor

from app.guardrail.types import Commitment

class PromiseTracker:
    def __init__(self, store: AuditStore):
        self.store = store
        self.extractor = CommitmentExtractor()

    def process_reply(self, failed_payment_id: str, customer_id: str, reply_text: str) -> Commitment:
        """
        Parses a customer reply, extracts commitments, updates database promise state,
        and adds the message to the case conversation logs.
        """
        timestamp = datetime.now().isoformat()
        
        # 1. Extract commitment
        commitment = self.extractor.extract_commitment(failed_payment_id, reply_text)
        
        # 2. If customer committed, save pending promise
        if commitment.commits:
            # Default to tomorrow if date is not parsed
            promised_date = commitment.promised_date
            if not promised_date:
                # Default to today
                promised_date = datetime.now().strftime("%Y-%m-%d")
                
            self.store.create_or_update_promise(
                failed_payment_id=failed_payment_id,
                customer_id=customer_id,
                promised_date=promised_date,
                confidence=commitment.confidence,
                status="pending",
                raw_reply=reply_text,
                timestamp=timestamp
            )
            
        # 3. Add to case conversation history
        case = self.store.get_case(failed_payment_id)
        if case:
            conv = case.get("conversation", [])
            # Append user reply
            conv.append({
                "sender": "user",
                "text": reply_text,
                "timestamp": timestamp
            })
            
            # If they committed, we might send an automated confirmation message
            if commitment.commits:
                promised_date_label = commitment.promised_date if commitment.promised_date else "jald hi"
                bot_reply = f"Thank you! Humne note kar liya hai ki aap {promised_date_label} tak pay karenge. Tab tak hum aapko disturb nahi karenge."
                conv.append({
                    "sender": "bot",
                    "text": bot_reply,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                bot_reply = "Aap is safe link se retry kar sakte hain agar payment issue fix ho gaya ho. Thank you."
                conv.append({
                    "sender": "bot",
                    "text": bot_reply,
                    "timestamp": datetime.now().isoformat()
                })
                
            case["conversation_json"] = json.dumps(conv) # convert to JSON list string
            self.store.upsert_case(case)
            
        return commitment

    def check_active_promise(self, customer_id: str, current_date_str: Optional[str] = None) -> bool:
        """
        Checks if the customer has an active pending promise.
        If the promised date is passed, it automatically transitions the promise status to 'broken'.
        Returns True if there is a valid pending promise (suppressing contact).
        """
        if not current_date_str:
            current_date_str = datetime.now().strftime("%Y-%m-%d")
            
        promise = self.store.get_active_promise(customer_id)
        if not promise:
            return False
            
        promised_date_str = promise.get("promised_date")
        if not promised_date_str:
            # Immediate/same-day promise, suppress for today
            return True
            
        try:
            current_dt = datetime.strptime(current_date_str, "%Y-%m-%d")
            promised_dt = datetime.strptime(promised_date_str, "%Y-%m-%d")
            
            if promised_dt >= current_dt:
                # Promise is still valid and in the future/today
                return True
            else:
                # Promised date has passed without payment -> broken promise!
                # Update status in db
                self.store.create_or_update_promise(
                    failed_payment_id=promise["failed_payment_id"],
                    customer_id=customer_id,
                    promised_date=promised_date_str,
                    confidence=promise["confidence"],
                    status="broken",
                    raw_reply=promise["raw_reply"],
                    timestamp=datetime.now().isoformat()
                )
                return False
        except Exception:
            # Fallback to true if date parsing fails to be safe
            return True

    def mark_promise_kept(self, customer_id: str):
        """
        Updates pending promise for customer to 'kept' when payment succeeds.
        """
        promise = self.store.get_active_promise(customer_id)
        if promise:
            self.store.create_or_update_promise(
                failed_payment_id=promise["failed_payment_id"],
                customer_id=customer_id,
                promised_date=promise["promised_date"],
                confidence=promise["confidence"],
                status="kept",
                raw_reply=promise["raw_reply"],
                timestamp=datetime.now().isoformat()
            )
