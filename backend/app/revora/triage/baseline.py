# backend/app/revora/triage/baseline.py

import os
from typing import List, Dict
from app.guardrail.types import FailedPayment, Diagnosis, TriageDecision, InterventionAction
from app.revora.triage.probability_model import RecoveryProbabilityModel
from app.revora.triage.expected_value import calculate_expected_value, get_action_cost


class BaselineTriage:
    def __init__(self):
        self.prob_model = RecoveryProbabilityModel()
        self.capacity_whatsapp = int(os.getenv("CAPACITY_WHATSAPP", "50"))
        self.capacity_human = int(os.getenv("CAPACITY_HUMAN_CALL", "5"))

    def _allocate_sorted(
        self,
        strategy_name: str,
        sorted_payments: List[FailedPayment],
        diagnoses: Dict[str, Diagnosis],
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        remaining_whatsapp = self.capacity_whatsapp
        remaining_human = self.capacity_human
        decisions = []

        for p in sorted_payments:
            diag = diagnoses.get(p.id)
            cause = diag.cause if diag else "unknown"
            prior_contacts = prior_contacts_counts.get(p.customer_id, 0)

            # Map default action based on cause
            default_action: InterventionAction = "suppress"
            channel = "suppress"

            if cause == "bank_timeout":
                default_action = "silent_retry"
                channel = "retry"
            elif cause in ["insufficient_balance", "wrong_otp", "card_declined", "expired_mandate", "unknown"]:
                # Try WhatsApp nudge by default
                default_action = "send_whatsapp_nudge"
                channel = "whatsapp"

            # Check capacity constraints
            is_allocated = False
            assigned_action = default_action

            if channel == "whatsapp":
                if remaining_whatsapp > 0:
                    remaining_whatsapp -= 1
                    is_allocated = True
                else:
                    assigned_action = "suppress"
                    channel = "suppress"
                    is_allocated = False
            elif channel == "human":
                if remaining_human > 0:
                    remaining_human -= 1
                    is_allocated = True
                else:
                    assigned_action = "suppress"
                    channel = "suppress"
                    is_allocated = False
            elif channel == "retry":
                is_allocated = True

            p_est = self.prob_model.estimate_probability(cause, assigned_action, prior_contacts)
            cost = get_action_cost(assigned_action, p.amount_paise)
            ev = calculate_expected_value(p_est, p.amount_paise, assigned_action, prior_contacts=prior_contacts)

            reason = f"Baseline ({strategy_name}) assigned '{assigned_action}' on channel '{channel}'"
            if assigned_action == "suppress":
                reason = f"Suppressed by Baseline ({strategy_name}) (capacity exhausted)"

            decisions.append(TriageDecision(
                failed_payment_id=p.id,
                candidate_action=assigned_action,
                channel=channel,
                expected_value=ev,
                probability_estimate=p_est,
                cost=cost,
                allocated=is_allocated,
                reason=reason
            ))

        return decisions

    def allocate_batch_fcfs(
        self,
        payments: List[FailedPayment],
        diagnoses: Dict[str, Diagnosis],
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        """First-Come First-Served: Sorted chronologically by timestamp."""
        sorted_payments = sorted(payments, key=lambda p: p.timestamp)
        return self._allocate_sorted("FCFS", sorted_payments, diagnoses, prior_contacts_counts)

    def allocate_batch_naive(
        self,
        payments: List[FailedPayment],
        diagnoses: Dict[str, Diagnosis],
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        """Alias for FCFS baseline for backward compatibility."""
        return self.allocate_batch_fcfs(payments, diagnoses, prior_contacts_counts)

    def allocate_batch_highest_amount(
        self,
        payments: List[FailedPayment],
        diagnoses: Dict[str, Diagnosis],
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        """Highest Amount First: Greedy priority by recovery amount (amount_paise)."""
        sorted_payments = sorted(payments, key=lambda p: p.amount_paise, reverse=True)
        return self._allocate_sorted("Highest Amount", sorted_payments, diagnoses, prior_contacts_counts)

    def allocate_batch_highest_prob(
        self,
        payments: List[FailedPayment],
        diagnoses: Dict[str, Diagnosis],
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        """Highest Probability First: Greedy priority by baseline recovery probability."""
        def get_prob(p: FailedPayment) -> float:
            diag = diagnoses.get(p.id)
            cause = diag.cause if diag else "unknown"
            prior = prior_contacts_counts.get(p.customer_id, 0)
            act = "silent_retry" if cause == "bank_timeout" else "send_whatsapp_nudge"
            return self.prob_model.estimate_probability(cause, act, prior)

        sorted_payments = sorted(payments, key=get_prob, reverse=True)
        return self._allocate_sorted("Highest Probability", sorted_payments, diagnoses, prior_contacts_counts)

