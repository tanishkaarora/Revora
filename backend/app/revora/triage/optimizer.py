# backend/app/revora/triage/optimizer.py

import os
import pulp
import logging
from typing import List, Dict, Tuple
from app.guardrail.types import FailedPayment, Diagnosis, TriageDecision, InterventionAction
from app.revora.triage.probability_model import RecoveryProbabilityModel
from app.revora.triage.expected_value import calculate_expected_value


logger = logging.getLogger(__name__)

# Map actions to their channel names
ACTION_TO_CHANNEL = {
    "silent_retry": "retry",
    "send_whatsapp_nudge": "whatsapp",
    "suggest_alt_method": "whatsapp",
    "escalate_human": "human",
    "issue_refund": "refund",
    "suppress": "suppress"
}

class TriageOptimizer:
    def __init__(self):
        self.prob_model = RecoveryProbabilityModel()
        self.capacity_whatsapp = int(os.getenv("CAPACITY_WHATSAPP", "50"))
        self.capacity_human = int(os.getenv("CAPACITY_HUMAN_CALL", "5"))
        self.fairness_floor_slots = int(os.getenv("FAIRNESS_FLOOR_SLOTS", "10"))
        self.low_amount_threshold_paise = 50000 # ₹500

    def allocate_batch(
        self, 
        payments: List[FailedPayment], 
        diagnoses: Dict[str, Diagnosis], 
        prior_contacts_counts: Dict[str, int]
    ) -> List[TriageDecision]:
        """
        Solves the LP to allocate interventions to a batch of payments.
        """
        if not payments:
            return []

        # 1. Define the optimization problem
        prob = pulp.LpProblem("Recovery_Triage_Optimization", pulp.LpMaximize)

        # Candidate actions for each payment
        actions: List[InterventionAction] = [
            "silent_retry", 
            "send_whatsapp_nudge", 
            "suggest_alt_method", 
            "escalate_human", 
            "issue_refund", 
            "suppress"
        ]        # 1. Compute for each payment all candidate action EVs and recovery probabilities
        action_candidates = {}
        for p in payments:
            diag = diagnoses.get(p.id)
            cause = diag.cause if diag else "unknown"
            prior_contacts = prior_contacts_counts.get(p.customer_id, 0)
            
            p_actions = {}
            for a in actions:
                p_recovery = self.prob_model.estimate_probability(cause, a, prior_contacts)
                ev = calculate_expected_value(p_recovery, p.amount_paise, a, prior_contacts=prior_contacts)
                p_actions[a] = (ev, p_recovery)
            action_candidates[p.id] = p_actions

        assigned_actions = {}
        allocated_flags = {}

        # 2. Silent Retry Allocation: Assign silent retry to bank_timeout cases with positive EV (0 channel cost)
        for p in payments:
            diag = diagnoses.get(p.id)
            cause = diag.cause if diag else "unknown"
            if cause == "bank_timeout":
                ev, _ = action_candidates[p.id]["silent_retry"]
                if ev > 0:
                    assigned_actions[p.id] = "silent_retry"
                    allocated_flags[p.id] = True

        # 3. Fairness Floor: Reserve up to fairness_floor_slots for low-amount cases (< ₹500)
        low_amount_cases = [
            p for p in payments 
            if p.amount_paise < self.low_amount_threshold_paise and p.id not in assigned_actions
        ]
        remaining_whatsapp_cap = self.capacity_whatsapp
        remaining_human_cap = self.capacity_human

        if low_amount_cases:
            max_fairness_cap = max(1, int(self.capacity_whatsapp * 0.2))
            target_slots = min(self.fairness_floor_slots, len(low_amount_cases), max_fairness_cap)
            low_amount_scored = []
            for p in low_amount_cases:
                best_wa_act = max(["send_whatsapp_nudge", "suggest_alt_method"], key=lambda a: action_candidates[p.id][a][0])
                low_amount_scored.append((p, best_wa_act, action_candidates[p.id][best_wa_act][0]))
            
            low_amount_scored.sort(key=lambda x: x[2], reverse=True)
            for p, best_act, ev in low_amount_scored[:target_slots]:
                if remaining_whatsapp_cap > 0:
                    assigned_actions[p.id] = best_act
                    allocated_flags[p.id] = True
                    remaining_whatsapp_cap -= 1

        # 4. Multi-Channel EV Knapsack: Rank unassigned candidates across channels by Expected Value
        all_candidates = []
        for p in payments:
            if p.id in assigned_actions:
                continue
            for a in ["send_whatsapp_nudge", "suggest_alt_method", "escalate_human"]:
                ev, _ = action_candidates[p.id][a]
                if ev > 0:
                    all_candidates.append((ev, p, a, ACTION_TO_CHANNEL[a]))

        all_candidates.sort(key=lambda x: x[0], reverse=True)

        for ev, p, a, channel in all_candidates:
            if p.id in assigned_actions:
                continue
            if channel == "whatsapp" and remaining_whatsapp_cap > 0:
                assigned_actions[p.id] = a
                allocated_flags[p.id] = True
                remaining_whatsapp_cap -= 1
            elif channel == "human" and remaining_human_cap > 0:
                assigned_actions[p.id] = a
                allocated_flags[p.id] = True
                remaining_human_cap -= 1

        # 5. Default unassigned cases to suppress
        for p in payments:
            if p.id not in assigned_actions:
                assigned_actions[p.id] = "suppress"
                allocated_flags[p.id] = False

        # 6. Build final TriageDecision objects
        from app.revora.triage.expected_value import get_action_cost
        decisions = []
        for p in payments:
            assigned_action = assigned_actions[p.id]
            is_allocated = allocated_flags[p.id]
            channel = ACTION_TO_CHANNEL[assigned_action]
            ev, p_est = action_candidates[p.id][assigned_action]
            cost = get_action_cost(assigned_action, p.amount_paise)

            reason = f"MILP Optimizer assigned '{assigned_action}' on channel '{channel}'"
            if channel == "whatsapp":
                reason += f" (WhatsApp Capacity cap: {self.capacity_whatsapp})"
            elif channel == "human":
                reason += f" (Human Capacity cap: {self.capacity_human})"
            elif assigned_action == "suppress":
                reason = "Suppressed by Triage optimizer (low expected value or capacity exhausted)"

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
