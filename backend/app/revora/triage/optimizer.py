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
        ]

        # 2. Decision variables: x[payment_id, action]
        # x_vars[(p.id, a)] = 1 if action a is assigned to payment p.id, else 0
        x_vars = {}
        ev_matrix = {}
        prob_matrix = {}

        for p in payments:
            diag = diagnoses.get(p.id)
            cause = diag.cause if diag else "unknown"
            prior_contacts = prior_contacts_counts.get(p.customer_id, 0)
            
            for a in actions:
                # Calculate probability of recovery
                p_recovery = self.prob_model.estimate_probability(cause, a, prior_contacts)
                # Calculate expected net value (ENV) including fatigue cost
                ev = calculate_expected_value(p_recovery, p.amount_paise, a, prior_contacts=prior_contacts)
                
                x_vars[(p.id, a)] = pulp.LpVariable(
                    name=f"x_{p.id}_{a}", 
                    cat="Binary"
                )
                ev_matrix[(p.id, a)] = ev
                prob_matrix[(p.id, a)] = p_recovery

        # 3. Objective: Maximize total expected value
        prob += pulp.lpSum(x_vars[(p.id, a)] * ev_matrix[(p.id, a)] for p in payments for a in actions)

        # 4. Constraint 1: Single assignment per payment
        # Each payment gets at most one action assigned
        for p in payments:
            prob += pulp.lpSum(x_vars[(p.id, a)] for a in actions) <= 1

        # 5. Constraint 2: WhatsApp Channel Capacity limit
        prob += pulp.lpSum(
            x_vars[(p.id, a)] 
            for p in payments 
            for a in actions 
            if ACTION_TO_CHANNEL[a] == "whatsapp"
        ) <= self.capacity_whatsapp

        # 6. Constraint 3: Human Channel Capacity limit
        prob += pulp.lpSum(
            x_vars[(p.id, a)] 
            for p in payments 
            for a in actions 
            if ACTION_TO_CHANNEL[a] == "human"
        ) <= self.capacity_human

        # 7. Constraint 4: Fairness Floor
        # Reserve slots for low-amount cases that would otherwise never clear the EV bar
        low_amount_cases = [p for p in payments if p.amount_paise < self.low_amount_threshold_paise]
        
        if low_amount_cases:
            # We reserve proportional slots for low-amount fairness (capped at 20% of WhatsApp capacity)
            max_fairness_cap = max(1, int(self.capacity_whatsapp * 0.2))
            target_slots = min(self.fairness_floor_slots, len(low_amount_cases), max_fairness_cap)
            if len(payments) < 50:
                target_slots = min(target_slots, max(1, len(low_amount_cases) // 3))
            prob += pulp.lpSum(
                x_vars[(p.id, a)] 
                for p in low_amount_cases 
                for a in actions 
                if ACTION_TO_CHANNEL[a] == "whatsapp"
            ) >= target_slots


        # 8. Solve the LP
        try:
            # Use default CBC solver, suppress console output
            status = prob.solve(pulp.PULP_CBC_CMD(msg=False))
        except Exception as e:
            logger.error(f"PuLP optimization failed: {e}. Falling back to default heuristics.")
            status = pulp.LpStatusInfeasible

        # 9. Extract results
        decisions = []
        
        # If solver fails or is infeasible, fall back to default behavior
        if status == pulp.LpStatusOptimal:
            for p in payments:
                assigned_action: InterventionAction = "suppress"
                is_allocated = False
                
                for a in actions:
                    if pulp.value(x_vars[(p.id, a)]) == 1.0:
                        assigned_action = a
                        # A case is allocated if it won a slot in active outreach or silent retry
                        is_allocated = (a != "suppress")
                        break
                        
                channel = ACTION_TO_CHANNEL[assigned_action]
                ev = ev_matrix[(p.id, assigned_action)]
                p_est = prob_matrix[(p.id, assigned_action)]
                
                # Fetch cost
                from app.revora.triage.expected_value import get_action_cost
                cost = get_action_cost(assigned_action, p.amount_paise)
                
                reason = f"LP Solver assigned '{assigned_action}' on channel '{channel}'"
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
        else:
            # Feasible fallback: allocate silent_retry to bank timeouts, suppress others or do basic assign
            logger.warning("Optimization failed to find optimal solution; falling back to heuristic assignment.")
            for p in payments:
                diag = diagnoses.get(p.id)
                cause = diag.cause if diag else "unknown"
                
                action: InterventionAction = "suppress"
                if cause == "bank_timeout":
                    action = "silent_retry"
                elif cause == "insufficient_balance":
                    action = "send_whatsapp_nudge"
                
                channel = ACTION_TO_CHANNEL[action]
                prior_cnt = prior_contacts_counts.get(p.customer_id, 0)
                p_est = self.prob_model.estimate_probability(cause, action, prior_cnt)
                from app.revora.triage.expected_value import get_action_cost
                cost = get_action_cost(action, p.amount_paise)

                ev = calculate_expected_value(p_est, p.amount_paise, action, prior_contacts=prior_cnt)
                
                decisions.append(TriageDecision(
                    failed_payment_id=p.id,
                    candidate_action=action,
                    channel=channel,
                    expected_value=ev,
                    probability_estimate=p_est,
                    cost=cost,
                    allocated=(action != "suppress"),
                    reason="Fallback assignment due to optimization solver error"
                ))

        return decisions
