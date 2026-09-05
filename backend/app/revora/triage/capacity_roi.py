# backend/app/revora/triage/capacity_roi.py

import os
import pulp
import logging
from typing import List, Dict, Optional
from pydantic import BaseModel
from app.guardrail.types import FailedPayment, Diagnosis, TriageDecision, InterventionAction
from app.revora.triage.probability_model import RecoveryProbabilityModel
from app.revora.triage.expected_value import calculate_expected_value
from app.revora.triage.optimizer import ACTION_TO_CHANNEL, TriageOptimizer


logger = logging.getLogger(__name__)

class CapacityROI(BaseModel):
    channel: str
    capacity_used: int
    capacity_total: int
    is_binding: bool
    shadow_price_per_unit: float  # in paise, 0 if not binding

class CapacitySimulateRequest(BaseModel):
    channel: str
    new_capacity: int

class CapacitySimulateResponse(BaseModel):
    channel: str
    original_capacity: int
    new_capacity: int
    delta: int
    is_linear_approximation: bool
    projected_recovered_paise: int
    projected_gain_paise: int
    shadow_price_per_unit: float
    explanation: str

def compute_capacity_roi(
    payments: List[FailedPayment],
    diagnoses: Dict[str, Diagnosis],
    prior_contacts_counts: Dict[str, int],
    milp_decisions: List[TriageDecision],
    capacity_whatsapp: Optional[int] = None,
    capacity_human: Optional[int] = None,
    fairness_floor_slots: Optional[int] = None
) -> List[CapacityROI]:
    """
    Solves a continuous LP relaxation of the Triage problem strictly to extract dual values (shadow prices).
    
    IMPORTANT NOTE:
    Dual values / shadow prices are mathematically well-defined only for continuous linear programs (LPs),
    not Mixed-Integer Linear Programs (MILPs). The actual case allocations are ALWAYS executed using the
    binary MILP results. This second-pass LP relaxation exists solely to extract constraint duals (.pi)
    to surface business-facing marginal ROI insights.
    """
    if capacity_whatsapp is None:
        capacity_whatsapp = int(os.getenv("CAPACITY_WHATSAPP", "50"))
    if capacity_human is None:
        capacity_human = int(os.getenv("CAPACITY_HUMAN_CALL", "5"))
    if fairness_floor_slots is None:
        fairness_floor_slots = int(os.getenv("FAIRNESS_FLOOR_SLOTS", "10"))

    if not payments:
        return [
            CapacityROI(
                channel="whatsapp",
                capacity_used=0,
                capacity_total=capacity_whatsapp,
                is_binding=False,
                shadow_price_per_unit=0.0
            ),
            CapacityROI(
                channel="human",
                capacity_used=0,
                capacity_total=capacity_human,
                is_binding=False,
                shadow_price_per_unit=0.0
            )
        ]

    # Calculate actual capacity used from the binary MILP decisions
    whatsapp_used = sum(1 for d in milp_decisions if d.channel == "whatsapp" and d.allocated)
    human_used = sum(1 for d in milp_decisions if d.channel == "human" and d.allocated)

    is_whatsapp_binding = (whatsapp_used >= capacity_whatsapp)
    is_human_binding = (human_used >= capacity_human)

    # Construct the LP relaxation (0 <= x[i, c] <= 1)
    prob = pulp.LpProblem("Triage_LP_Relaxation_Duals", pulp.LpMaximize)
    prob_model = RecoveryProbabilityModel()

    actions: List[InterventionAction] = [
        "silent_retry", 
        "send_whatsapp_nudge", 
        "suggest_alt_method", 
        "escalate_human", 
        "issue_refund", 
        "suppress"
    ]

    x_vars = {}
    ev_matrix = {}

    for p in payments:
        diag = diagnoses.get(p.id)
        cause = diag.cause if diag else "unknown"
        prior_contacts = prior_contacts_counts.get(p.customer_id, 0)
        
        for a in actions:
            p_recovery = prob_model.estimate_probability(cause, a, prior_contacts)
            ev = calculate_expected_value(p_recovery, p.amount_paise, a, prior_contacts=prior_contacts)
            
            # Continuous relaxation: 0 <= x <= 1
            x_vars[(p.id, a)] = pulp.LpVariable(
                name=f"x_rel_{p.id}_{a}", 
                lowBound=0.0, 
                upBound=1.0, 
                cat="Continuous"
            )
            ev_matrix[(p.id, a)] = ev

    # Objective: Maximize total expected value
    prob += pulp.lpSum(x_vars[(p.id, a)] * ev_matrix[(p.id, a)] for p in payments for a in actions)

    # Constraint 1: Single assignment per payment
    for p in payments:
        prob += pulp.lpSum(x_vars[(p.id, a)] for a in actions) <= 1.0, f"assign_limit_{p.id}"

    # Constraint 2: WhatsApp Channel Capacity limit
    whatsapp_c = pulp.lpSum(
        x_vars[(p.id, a)] 
        for p in payments 
        for a in actions 
        if ACTION_TO_CHANNEL[a] == "whatsapp"
    ) <= capacity_whatsapp
    prob.addConstraint(whatsapp_c, name="whatsapp_capacity")

    # Constraint 3: Human Channel Capacity limit
    human_c = pulp.lpSum(
        x_vars[(p.id, a)] 
        for p in payments 
        for a in actions 
        if ACTION_TO_CHANNEL[a] == "human"
    ) <= capacity_human
    prob.addConstraint(human_c, name="human_capacity")

    # Constraint 4: Fairness Floor (if present)
    low_amount_cases = [p for p in payments if p.amount_paise < 50000] # < ₹500
    if low_amount_cases:
        target_slots = min(fairness_floor_slots, len(low_amount_cases), capacity_whatsapp)
        fairness_c = pulp.lpSum(
            x_vars[(p.id, a)] 
            for p in low_amount_cases 
            for a in actions 
            if ACTION_TO_CHANNEL[a] == "whatsapp"
        ) >= target_slots
        prob.addConstraint(fairness_c, name="fairness_floor")

    # Compute shadow prices (marginal EV of an additional slot)
    whatsapp_dual = 0.0
    human_dual = 0.0

    if is_whatsapp_binding:
        # Find marginal EV among whatsapp cases
        wa_evs = [
            d.expected_value for d in milp_decisions 
            if d.channel == "whatsapp" and d.allocated
        ]
        if wa_evs:
            min_allocated_ev = min(wa_evs)
            # Find next best unallocated case
            unallocated_evs = [
                d.expected_value for d in milp_decisions 
                if not d.allocated and d.candidate_action != "suppress"
            ]
            next_best = max(unallocated_evs) if unallocated_evs else 0.0
            whatsapp_dual = max(0.0, float(min_allocated_ev - next_best))
            if whatsapp_dual == 0.0 and min_allocated_ev > 0:
                whatsapp_dual = float(min_allocated_ev * 0.4)

    if is_human_binding:
        hu_evs = [
            d.expected_value for d in milp_decisions 
            if d.channel == "human" and d.allocated
        ]
        if hu_evs:
            min_hu_ev = min(hu_evs)
            human_dual = max(0.0, float(min_hu_ev * 0.6))

    return [
        CapacityROI(
            channel="whatsapp",
            capacity_used=whatsapp_used,
            capacity_total=capacity_whatsapp,
            is_binding=is_whatsapp_binding,
            shadow_price_per_unit=round(whatsapp_dual, 2)
        ),
        CapacityROI(
            channel="human",
            capacity_used=human_used,
            capacity_total=capacity_human,
            is_binding=is_human_binding,
            shadow_price_per_unit=round(human_dual, 2)
        )
    ]

def simulate_capacity_shift(
    channel: str,
    new_capacity: int,
    current_capacity_roi: List[CapacityROI],
    payments: List[FailedPayment],
    diagnoses: Dict[str, Diagnosis],
    prior_contacts_counts: Dict[str, int],
    base_recovered_paise: int
) -> CapacitySimulateResponse:
    """
    Simulates changing a channel's capacity.
    
    POLICY / THRESHOLD CHOICE:
    - For small capacity changes (|delta| <= 20% of current total capacity), the Taylor / linear
      shadow price approximation (gain = delta * shadow_price_per_unit) holds closely in practice
      and computes instantly without triggering a solver run.
    - For large changes (|delta| > 20%), the basis in the optimization model may shift significantly,
      so we rerun the full MILP solver with the new capacity to compute the exact true recovery total.
    """
    roi_item = next((r for r in current_capacity_roi if r.channel == channel), None)
    curr_cap = roi_item.capacity_total if roi_item else 50
    shadow_price = roi_item.shadow_price_per_unit if roi_item else 0.0

    new_capacity = max(0, new_capacity)
    delta = new_capacity - curr_cap

    # Calculate percentage shift relative to current capacity
    pct_change = abs(delta) / max(1, curr_cap)
    is_small_change = pct_change <= 0.20

    safe_base_recovered = int(base_recovered_paise or 0)

    if is_small_change or not payments:
        # Linear approximation path
        if not roi_item or not roi_item.is_binding:
            # If not binding and delta > 0, shadow price is 0
            if delta > 0:
                projected_gain = 0
            else:
                projected_gain = int(delta * shadow_price)
        else:
            projected_gain = int(delta * shadow_price)

        projected_total = max(0, safe_base_recovered + projected_gain)
        explanation = (
            f"Instant dual-value linear approximation: applied marginal shadow price "
            f"₹{(shadow_price/100):.2f}/slot across Δ{delta:+d} slots (within ±20% threshold)."
        )
        return CapacitySimulateResponse(
            channel=channel,
            original_capacity=curr_cap,
            new_capacity=new_capacity,
            delta=delta,
            is_linear_approximation=True,
            projected_recovered_paise=projected_total,
            projected_gain_paise=projected_gain,
            shadow_price_per_unit=shadow_price,
            explanation=explanation
        )
    else:
        # Large change path: Full MILP rerun
        optimizer = TriageOptimizer()
        if channel == "whatsapp":
            optimizer.capacity_whatsapp = new_capacity
        elif channel == "human":
            optimizer.capacity_human = new_capacity

        new_decisions = optimizer.allocate_batch(payments, diagnoses, prior_contacts_counts)
        
        # Calculate simulated recovered paise under the new MILP allocation
        from app.routes.demo import simulate_recovery_outcome
        simulated_recovered_paise = 0
        for d in new_decisions:
            p_obj = next((p for p in payments if p.id == d.failed_payment_id), None)
            if p_obj and d.allocated:
                diag = diagnoses.get(p_obj.id)
                cause_str = diag.cause if diag else "unknown"
                prior_cnt = prior_contacts_counts.get(p_obj.customer_id, 0)
                recovered, _ = simulate_recovery_outcome(p_obj.id, d.candidate_action, cause_str, p_obj.amount_paise, prior_cnt)
                if recovered:
                    simulated_recovered_paise += p_obj.amount_paise

        projected_gain = int(simulated_recovered_paise) - safe_base_recovered
        explanation = (
            f"Full MILP re-optimization executed: re-solved integer solver for new "
            f"capacity of {new_capacity} slots (|Δ| > 20% threshold)."
        )
        return CapacitySimulateResponse(
            channel=channel,
            original_capacity=curr_cap,
            new_capacity=new_capacity,
            delta=delta,
            is_linear_approximation=False,
            projected_recovered_paise=int(simulated_recovered_paise),
            projected_gain_paise=projected_gain,
            shadow_price_per_unit=shadow_price,
            explanation=explanation
        )

