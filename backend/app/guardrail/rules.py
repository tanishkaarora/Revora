# backend/app/guardrail/rules.py
import os
from datetime import datetime
from typing import Tuple, Optional
from app.guardrail.kill_switch import kill_switch
from app.guardrail.types import FailedPayment, TriageDecision, DecisionOutcome
from app.audit.store import AuditStore
from app.revora.execution.promise_tracker import PromiseTracker


def check_kill_switch() -> Tuple[DecisionOutcome, str, str]:
    if kill_switch.is_active():
        return "BLOCK", "kill_switch_active", "Global emergency freeze active."
    return "ALLOW", "none", ""

def check_contact_cap(customer_id: str, store: AuditStore) -> Tuple[DecisionOutcome, str, str]:
    max_contacts = int(os.getenv("MAX_CONTACTS_PER_CASE", "3"))
    contacts_count = store.get_recent_contacts_count(customer_id)
    if contacts_count >= max_contacts:
        return "BLOCK", "contact_cap_exceeded", f"Customer contacted {contacts_count} times, exceeding cap of {max_contacts}."
    return "ALLOW", "none", ""

def check_quiet_hours(action: str, current_time_str: Optional[str] = None) -> Tuple[DecisionOutcome, str, str]:
    # Silent retries need no customer-facing contact and can run anytime
    if action == "silent_retry" or action == "suppress":
        return "ALLOW", "none", ""

    start_str = os.getenv("QUIET_HOURS_START", "21:00")
    end_str = os.getenv("QUIET_HOURS_END", "08:00")
    
    if not current_time_str:
        current_time_str = datetime.now().strftime("%H:%M")
        
    t = datetime.strptime(current_time_str, "%H:%M").time()
    start = datetime.strptime(start_str, "%H:%M").time()
    end = datetime.strptime(end_str, "%H:%M").time()
    
    is_quiet = False
    if start <= end:
        is_quiet = start <= t <= end
    else:
        # Quiet hours span midnight (e.g. 21:00 to 08:00)
        is_quiet = t >= start or t <= end
        
    if is_quiet:
        return "BLOCK", "quiet_hours", f"Current time {current_time_str} is inside quiet hours ({start_str} - {end_str})."
        
    return "ALLOW", "none", ""

def check_promise_suppression(customer_id: str, store: AuditStore, current_date_str: Optional[str] = None) -> Tuple[DecisionOutcome, str, str]:
    tracker = PromiseTracker(store)
    if tracker.check_active_promise(customer_id, current_date_str):
        promise = store.get_active_promise(customer_id)
        promised_date = promise.get("promised_date") if promise else "unknown"
        return "BLOCK", "promise_pending", f"Customer has a pending promise due on {promised_date}."
    return "ALLOW", "none", ""

def check_refund_threshold(action: str, amount_paise: int) -> Tuple[DecisionOutcome, str, str]:
    if action == "issue_refund":
        threshold = int(os.getenv("REFUND_SIGNOFF_THRESHOLD_PAISE", "500000")) # default ₹5000 / 500,000 paise
        if amount_paise > threshold:
            amount_rupees = amount_paise / 100.0
            threshold_rupees = threshold / 100.0
            return (
                "ESCALATE", 
                "refund_signature_required", 
                f"Refund amount ₹{amount_rupees:.2f} exceeds auto-refund limit of ₹{threshold_rupees:.2f}. Requires manual approval."
            )
    return "ALLOW", "none", ""
