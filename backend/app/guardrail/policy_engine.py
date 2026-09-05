# backend/app/guardrail/policy_engine.py
from datetime import datetime
from typing import Optional
from app.guardrail.types import FailedPayment, TriageDecision, GuardrailDecision, DecisionOutcome
from app.guardrail.rules import (
    check_kill_switch,
    check_opt_out,
    check_contact_cap,
    check_quiet_hours,
    check_promise_suppression,
    check_refund_threshold
)
from app.audit.store import AuditStore

class PolicyEngine:
    def __init__(
        self, 
        store: AuditStore,
        opt_outs_set: Optional[set] = None,
        contact_counts_map: Optional[dict] = None,
        active_promises_map: Optional[dict] = None
    ):
        self.store = store
        self.opt_outs_set = opt_outs_set
        self.contact_counts_map = contact_counts_map
        self.active_promises_map = active_promises_map

    def evaluate(
        self, 
        payment: FailedPayment, 
        triage: TriageDecision,
        current_time_str: Optional[str] = None,
        current_date_str: Optional[str] = None
    ) -> GuardrailDecision:
        """
        Runs the deterministic policy pipeline on the allocated triage action.
        Returns a GuardrailDecision.
        """
        # If the case was not allocated capacity by Triage, it is suppressed by triage
        if not triage.allocated or triage.candidate_action == "suppress":
            return GuardrailDecision(
                failed_payment_id=payment.id,
                outcome="BLOCK",
                rule_fired="suppressed_by_triage",
                reason="Capacity exhausted or low expected recovery value.",
                timestamp=datetime.now().isoformat()
            )

        # 1. Check Kill Switch
        outcome, rule, reason = check_kill_switch()
        if outcome != "ALLOW":
            return self._build_decision(payment.id, outcome, rule, reason)

        # 2. Check Customer Opt-Out / Refusal (Permanent Suppression)
        if self.opt_outs_set is not None:
            if payment.customer_id in self.opt_outs_set:
                return self._build_decision(payment.id, "BLOCK", "customer_opted_out", "Customer has explicitly refused outreach or opted out.")
        else:
            outcome, rule, reason = check_opt_out(payment.customer_id, self.store)
            if outcome != "ALLOW":
                return self._build_decision(payment.id, outcome, rule, reason)

        # 3. Check Contact-Frequency Cap
        if self.contact_counts_map is not None:
            import os
            max_contacts = int(os.getenv("MAX_CONTACTS_PER_CASE", "3"))
            contacts_count = self.contact_counts_map.get(payment.customer_id, 0)
            if contacts_count >= max_contacts:
                return self._build_decision(payment.id, "BLOCK", "contact_cap_exceeded", f"Customer contacted {contacts_count} times, exceeding cap of {max_contacts}.")
        else:
            outcome, rule, reason = check_contact_cap(payment.customer_id, self.store)
            if outcome != "ALLOW":
                return self._build_decision(payment.id, outcome, rule, reason)

        # 4. Check Quiet Hours
        outcome, rule, reason = check_quiet_hours(triage.candidate_action, current_time_str)
        if outcome != "ALLOW":
            return self._build_decision(payment.id, outcome, rule, reason)

        # 5. Check Promise Suppression
        if self.active_promises_map is not None:
            if payment.customer_id in self.active_promises_map:
                promised_date = self.active_promises_map[payment.customer_id]
                return self._build_decision(payment.id, "BLOCK", "promise_pending", f"Customer has a pending promise due on {promised_date}.")
        else:
            outcome, rule, reason = check_promise_suppression(payment.customer_id, self.store, current_date_str)
            if outcome != "ALLOW":
                return self._build_decision(payment.id, outcome, rule, reason)

        # 6. Check Refund Limit Sign-off
        outcome, rule, reason = check_refund_threshold(triage.candidate_action, payment.amount_paise)
        if outcome != "ALLOW":
            return self._build_decision(payment.id, outcome, rule, reason)

        # Default ALLOW decision
        return GuardrailDecision(
            failed_payment_id=payment.id,
            outcome="ALLOW",
            rule_fired="none",
            reason="All policy checks passed successfully.",
            timestamp=datetime.now().isoformat()
        )

    def _build_decision(self, payment_id: str, outcome: DecisionOutcome, rule: str, reason: str) -> GuardrailDecision:
        return GuardrailDecision(
            failed_payment_id=payment_id,
            outcome=outcome,
            rule_fired=rule,
            reason=reason,
            timestamp=datetime.now().isoformat()
        )
