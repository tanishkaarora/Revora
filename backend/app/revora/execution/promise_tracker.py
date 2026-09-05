# backend/app/revora/execution/promise_tracker.py

import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.audit.store import AuditStore
from app.revora.execution.commitment_extractor import CommitmentExtractor
from app.guardrail.types import (
    Commitment,
    FailedPayment,
    Diagnosis,
    TriageDecision,
    GuardrailDecision,
    AuditLogEntry
)

class PromiseTracker:
    def __init__(self, store: AuditStore):
        self.store = store
        self.extractor = CommitmentExtractor()

    def process_reply(self, failed_payment_id: str, customer_id: str, reply_text: str) -> Commitment:
        """
        Parses a customer reply, classifies outcome into commits, refuses/opt-out, or ambiguous,
        updates database promise state / permanent suppression, logs audit trail,
        and adds the message to the case conversation logs.
        """
        timestamp = datetime.now().isoformat()
        
        # 1. Extract commitment / classification
        commitment = self.extractor.extract_commitment(failed_payment_id, reply_text)
        
        # 2. Update promise or permanent suppression state in database
        if commitment.outcome == "commits" or commitment.commits:
            # Default to tomorrow if date is not parsed
            promised_date = commitment.promised_date
            if not promised_date:
                promised_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                
            self.store.create_or_update_promise(
                failed_payment_id=failed_payment_id,
                customer_id=customer_id,
                promised_date=promised_date,
                confidence=commitment.confidence,
                status="pending",
                raw_reply=reply_text,
                timestamp=timestamp
            )
        elif commitment.outcome == "refuses" or commitment.refuses:
            # Customer explicitly refused / requested opt-out -> mark as permanently suppressed
            self.store.create_or_update_promise(
                failed_payment_id=failed_payment_id,
                customer_id=customer_id,
                promised_date=None,
                confidence=commitment.confidence,
                status="opted_out",
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
            
            # Handle reply outcome
            if commitment.outcome == "commits" or commitment.commits:
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
            elif commitment.outcome == "refuses" or commitment.refuses:
                # Log the opt-out event distinctly in the audit trail & case conversation
                conv.append({
                    "sender": "system",
                    "text": "Customer refusal / opt-out detected. Case permanently suppressed. Policy status: BLOCKED.",
                    "timestamp": timestamp
                })
                # Single brief acknowledgment rather than a retry-link nudge
                bot_reply = "Samajh gaye, hum aapko dobara contact nahi karenge."
                conv.append({
                    "sender": "bot",
                    "text": bot_reply,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Update case fields to permanently suppressed
                case["lifecycle_state"] = "SUPPRESSED"
                case["outcome"] = "BLOCK"
                case["rule_fired"] = "customer_opted_out"
                case["guardrail_reason"] = "Customer explicitly opted out / refused payment. Permanent suppression active."
                
                # Create distinct audit log entry for opt-out event
                failed_payment = FailedPayment(
                    id=case["id"],
                    customer_id=case["customer_id"],
                    amount_paise=case["amount_paise"],
                    method=case["method"],
                    error_code=case["error_code"],
                    error_reason=case["error_reason"],
                    timestamp=case["timestamp"]
                )
                diagnosis = Diagnosis(
                    failed_payment_id=case["id"],
                    cause=case["cause"],
                    confidence=case.get("diagnosis_confidence", 1.0),
                    source=case.get("diagnosis_source", "rule"),
                    evidence=case.get("evidence", {})
                )
                triage_decision = TriageDecision(
                    failed_payment_id=case["id"],
                    candidate_action="suppress",
                    channel=case.get("channel", "whatsapp"),
                    expected_value=0.0,
                    probability_estimate=0.0,
                    cost=0.0,
                    allocated=False,
                    reason="Customer explicitly opted out / refused outreach."
                )
                guardrail_decision = GuardrailDecision(
                    failed_payment_id=case["id"],
                    outcome="BLOCK",
                    rule_fired="customer_opted_out",
                    reason=f"Customer reply '{reply_text}' classified as refusal/opt-out. All future contact permanently suppressed.",
                    timestamp=timestamp
                )
                audit_entry = AuditLogEntry(
                    id=f"audit_optout_{failed_payment_id}_{int(datetime.now().timestamp() * 1000)}",
                    failed_payment=failed_payment,
                    diagnosis=diagnosis,
                    triage_decision=triage_decision,
                    guardrail_decision=guardrail_decision,
                    lifecycle_state="SUPPRESSED",
                    timestamp=timestamp
                )
                self.store.add_audit_entry(audit_entry)
            elif commitment.outcome == "requests_link" or commitment.requests_link:
                # Customer explicitly requested payment/retry link -> send link directly
                conv.append({
                    "sender": "system",
                    "text": "Customer requested payment link. Fresh retry link dispatched.",
                    "timestamp": timestamp
                })
                link = f"https://rzp.io/l/retry_{failed_payment_id}"
                bot_reply = f"Yeh lijiye aapka payment retry link: {link}. Is link par click karke aap payment complete kar sakte hain. Thank you!"
                conv.append({
                    "sender": "bot",
                    "text": bot_reply,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                # Ambiguous / No-signal: do NOT auto-send another retry nudge
                conv.append({
                    "sender": "system",
                    "text": "Customer reply received (no payment commitment or refusal detected). No automated retry nudge sent.",
                    "timestamp": timestamp
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
