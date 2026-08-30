# backend/tests/test_capacity_roi.py
import pytest
from app.guardrail.types import FailedPayment, Diagnosis, TriageDecision
from app.revora.triage.capacity_roi import compute_capacity_roi, simulate_capacity_shift, CapacityROI, CapacitySimulateRequest
from app.revora.triage.optimizer import TriageOptimizer

from app.routes.results import get_capacity_roi, simulate_capacity
from app.routes.demo import results_cache

def test_capacity_roi_analytical_small_problem():
    """
    Constructs a hand-crafted 3-case problem:
    - Case 1: ₹5,000 amount, high recovery probability on WhatsApp
    - Case 2: ₹3,000 amount, medium recovery probability on WhatsApp
    - Case 3: ₹1,000 amount, low recovery probability on WhatsApp
    When capacity = 1, only Case 1 gets chosen; constraint is binding;
    the shadow price represents the marginal value of unlocking slot 2.
    """
    payments = [
        FailedPayment(
            id="pay_test_001",
            customer_id="cust_001",
            amount_paise=500000, # ₹5,000
            method="upi",
            error_code="INSUFFICIENT_FUNDS",
            error_reason="insufficient balance",
            timestamp="2026-08-29T10:00:00Z"
        ),
        FailedPayment(
            id="pay_test_002",
            customer_id="cust_002",
            amount_paise=300000, # ₹3,000
            method="upi",
            error_code="INSUFFICIENT_FUNDS",
            error_reason="insufficient balance",
            timestamp="2026-08-29T10:01:00Z"
        ),
        FailedPayment(
            id="pay_test_003",
            customer_id="cust_003",
            amount_paise=100000, # ₹1,000
            method="upi",
            error_code="INSUFFICIENT_FUNDS",
            error_reason="insufficient balance",
            timestamp="2026-08-29T10:02:00Z"
        )
    ]

    diagnoses = {
        p.id: Diagnosis(failed_payment_id=p.id, cause="insufficient_balance", confidence=0.9, source="rule", evidence={})
        for p in payments
    }
    prior_contacts = {p.customer_id: 0 for p in payments}

    # Solve MILP with tight WhatsApp capacity = 1
    optimizer = TriageOptimizer()
    optimizer.capacity_whatsapp = 1
    optimizer.capacity_human = 0
    optimizer.fairness_floor_slots = 0

    milp_decisions = optimizer.allocate_batch(payments, diagnoses, prior_contacts)

    allocated_wa = [d for d in milp_decisions if d.channel == "whatsapp" and d.allocated]
    assert len(allocated_wa) == 1
    assert allocated_wa[0].failed_payment_id == "pay_test_001"

    # Compute Capacity ROI via LP relaxation
    roi_results = compute_capacity_roi(
        payments=payments,
        diagnoses=diagnoses,
        prior_contacts_counts=prior_contacts,
        milp_decisions=milp_decisions,
        capacity_whatsapp=1,
        capacity_human=0,
        fairness_floor_slots=0
    )

    wa_roi = next(r for r in roi_results if r.channel == "whatsapp")
    assert wa_roi.is_binding is True
    assert wa_roi.capacity_used == 1
    assert wa_roi.capacity_total == 1
    # Shadow price should be strictly positive (marginal value of next best payment ₹3,000 with ~0.60 prob)
    assert wa_roi.shadow_price_per_unit > 0.0

    # Now solve unconstrained (capacity = 10): constraint is NOT binding, shadow price = 0
    optimizer.capacity_whatsapp = 10
    milp_decisions_unconstrained = optimizer.allocate_batch(payments, diagnoses, prior_contacts)
    roi_unconstrained = compute_capacity_roi(
        payments=payments,
        diagnoses=diagnoses,
        prior_contacts_counts=prior_contacts,
        milp_decisions=milp_decisions_unconstrained,
        capacity_whatsapp=10,
        capacity_human=5,
        fairness_floor_slots=0
    )
    wa_roi_unconstrained = next(r for r in roi_unconstrained if r.channel == "whatsapp")
    assert wa_roi_unconstrained.is_binding is False
    assert wa_roi_unconstrained.shadow_price_per_unit == 0.0

def test_capacity_simulation_linear_vs_milp():
    """
    Tests the +/-20% capacity simulation branching logic:
    - delta <= 20% -> uses linear approximation
    - delta > 20% -> re-solves full MILP
    """
    current_roi = [
        CapacityROI(
            channel="whatsapp",
            capacity_used=50,
            capacity_total=50,
            is_binding=True,
            shadow_price_per_unit=35000.0  # ₹350 per slot
        ),
        CapacityROI(
            channel="human",
            capacity_used=5,
            capacity_total=5,
            is_binding=True,
            shadow_price_per_unit=50000.0  # ₹500 per slot
        )
    ]

    # 1. Small change (+5 slots out of 50 = +10% <= 20%)
    sim_small = simulate_capacity_shift(
        channel="whatsapp",
        new_capacity=55,
        current_capacity_roi=current_roi,
        payments=[],
        diagnoses={},
        prior_contacts_counts={},
        base_recovered_paise=1000000
    )
    assert sim_small.is_linear_approximation is True
    assert sim_small.delta == 5
    assert sim_small.projected_gain_paise == 5 * 35000
    assert sim_small.projected_recovered_paise == 1000000 + (5 * 35000)

    # 2. Large change (+25 slots out of 50 = +50% > 20%)
    payments = [
        FailedPayment(
            id=f"pay_sim_{i}",
            customer_id=f"cust_sim_{i}",
            amount_paise=100000,
            method="upi",
            error_code="INSUFFICIENT_FUNDS",
            error_reason="insufficient balance",
            timestamp="2026-08-29T10:00:00Z"
        )
        for i in range(75)
    ]
    diagnoses = {p.id: Diagnosis(failed_payment_id=p.id, cause="insufficient_balance", confidence=0.8, source="rule", evidence={}) for p in payments}
    prior_contacts = {p.customer_id: 0 for p in payments}

    sim_large = simulate_capacity_shift(
        channel="whatsapp",
        new_capacity=75,
        current_capacity_roi=current_roi,
        payments=payments,
        diagnoses=diagnoses,
        prior_contacts_counts=prior_contacts,
        base_recovered_paise=1000000
    )
    assert sim_large.is_linear_approximation is False
    assert sim_large.delta == 25
    assert sim_large.new_capacity == 75

def test_capacity_roi_routes():
    """
    Tests GET /results/capacity-roi and POST /results/capacity-roi/simulate handlers.
    """
    # Test GET endpoint handler
    data = get_capacity_roi()
    assert isinstance(data, list)
    assert len(data) == 2
    assert any(c.channel == "whatsapp" for c in data)
    assert any(c.channel == "human" for c in data)

    # Test POST endpoint handler
    req = CapacitySimulateRequest(channel="whatsapp", new_capacity=55)
    sim_data = simulate_capacity(req)
    assert sim_data.channel == "whatsapp"
    assert sim_data.new_capacity == 55
    assert sim_data.projected_recovered_paise >= 0
    assert sim_data.shadow_price_per_unit >= 0.0
