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
            # If no initial bot message in conv, synthesize the initial outbound nudge first
            has_bot = any(m.get("sender") == "bot" for m in conv)
            if not has_bot:
                from seed.seed_data import get_customer_name
                c_name = get_customer_name(customer_id)
                amount_rupees = case.get("amount_paise", 100000) / 100.0
                cause = case.get("cause", "unknown")
                from app.llm.fallback_keywords import fallback_generate_hinglish_message
                link = f"https://rzp.io/l/retry_{failed_payment_id}"
                initial_nudge = fallback_generate_hinglish_message(c_name, amount_rupees, link, cause)
                conv.insert(0, {
                    "sender": "bot",
                    "text": initial_nudge,
                    "timestamp": case.get("timestamp", timestamp)
                })

            # Append customer user reply
            conv.append({
                "sender": "user",
                "text": reply_text,
                "timestamp": timestamp
            })
            
            # If customer committed, add confirmation badge and follow-up bot reply
            if commitment.commits:
                promised_date_label = commitment.promised_date if commitment.promised_date else "soon"
                conv.append({
                    "sender": "system",
                    "text": f"Payment commitment detected ({promised_date_label}). Outreach suppressed. Policy status: HOLD.",
                    "timestamp": timestamp
                })
                bot_reply = f"Thank you! Humne note kar liya hai ki aap {promised_date_label} tak pay karenge. Tab tak hum aapko disturb nahi karenge."
                conv.append({
                    "sender": "bot",
                    "text": bot_reply,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                bot_reply = "Aap is safe link se retry kar sakte hain agar payment issue fix ho gaya ho: https://rzp.io/l/retry. Thank you!"
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
            
        promised_date = promise.get("promised_date")
        if not promised_date:
            return True # indefinite pending promise, suppress contact
            
        if promised_date >= current_date_str:
            # Valid pending promise in the future/today -> SUPPRESS
            return True
        else:
            # Promise expired and payment not received -> transition to 'broken'
            self.store.create_or_update_promise(
                failed_payment_id=promise["failed_payment_id"],
                customer_id=customer_id,
                promised_date=promised_date,
                confidence=promise.get("confidence", 0.8),
                status="broken",
                raw_reply=promise.get("raw_reply", ""),
                timestamp=datetime.now().isoformat()
            )
            return False

    def mark_promise_kept(self, customer_id: str):
        """
        Transitions active promise to 'kept' when payment is successfully recovered.
        """
        promise = self.store.get_active_promise(customer_id)
        if promise:
            self.store.create_or_update_promise(
                failed_payment_id=promise["failed_payment_id"],
                customer_id=customer_id,
                promised_date=promise.get("promised_date"),
                confidence=promise.get("confidence", 1.0),
                status="kept",
                raw_reply=promise.get("raw_reply", ""),
                timestamp=datetime.now().isoformat()
            )
