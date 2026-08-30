# backend/tests/test_optimizer.py
import pytest
import os
from app.guardrail.types import FailedPayment, Diagnosis
from app.revora.triage.optimizer import TriageOptimizer


def test_optimizer_capacity_constraints(monkeypatch):
    # Set capacity constraints explicitly using environment variables
    # WhatsApp cap = 3, Human cap = 1
    monkeypatch.setenv("CAPACITY_WHATSAPP", "3")
    monkeypatch.setenv("CAPACITY_HUMAN_CALL", "1")
    monkeypatch.setenv("FAIRNESS_FLOOR_SLOTS", "0")

    optimizer = TriageOptimizer()
    
    # 1. Create a batch of 10 payments all with high value so they compete for capacity
    payments = []
    diagnoses = {}
    prior_contacts = {}
    
    for i in range(10):
        p_id = f"pay_opt_{i}"
        cust_id = f"cust_opt_{i}"
        
        # High value to encourage outreach selection
        payments.append(FailedPayment(
            id=p_id,
            customer_id=cust_id,
            amount_paise=1000000, # ₹10,000
            method="upi",
            error_code="insufficient_balance",
            error_reason="Insufficient balance",
            timestamp="2026-08-28T12:00:00"
        ))
        
        # Set cause to insufficient_balance (which has high P(recovery) for whatsapp/human)
        diagnoses[p_id] = Diagnosis(
            failed_payment_id=p_id,
            cause="insufficient_balance",
            confidence=1.0,
            source="rule",
            evidence={}
        )
        
        prior_contacts[cust_id] = 0

    # 2. Run the LP solver
    decisions = optimizer.allocate_batch(payments, diagnoses, prior_contacts)

    # 3. Analyze channel allocations
    whatsapp_allocations = 0
    human_allocations = 0
    retry_allocations = 0
    suppress_allocations = 0

    for d in decisions:
        assert d.failed_payment_id in [p.id for p in payments]
        if d.allocated:
            if d.channel == "whatsapp":
                whatsapp_allocations += 1
            elif d.channel == "human":
                human_allocations += 1
            elif d.channel == "retry":
                retry_allocations += 1
        else:
            assert d.candidate_action == "suppress"
            suppress_allocations += 1

    # 4. CRITICAL ASSERTIONS: Verify that allocations NEVER exceed the configured capacity constraints!
    assert whatsapp_allocations <= 3, f"WhatsApp allocations ({whatsapp_allocations}) exceeded capacity constraint of 3!"
    assert human_allocations <= 1, f"Human allocations ({human_allocations}) exceeded capacity constraint of 1!"
    
    # Verify overall assignments: total allocated + suppressed must equal total payments (10)
    assert whatsapp_allocations + human_allocations + retry_allocations + suppress_allocations == 10


def test_expected_value_strictly_decreases_with_prior_contacts():
    """
    Business Invariant / Part 3 Requirement:
    Confirms that Expected Net Value (EV) strictly decreases as prior contact count increases
    for the same case, all else equal, due to fatigue cost escalation and probability decay.
    """
    from app.revora.triage.expected_value import calculate_expected_value
    from app.revora.triage.probability_model import RecoveryProbabilityModel


    model = RecoveryProbabilityModel(load_historical=True)
    amount_paise = 200000  # ₹2,000
    cause = "insufficient_balance"
    action = "send_whatsapp_nudge"

    evs = []
    for prior in range(4):
        p_est = model.estimate_probability(cause, action, prior)
        ev = calculate_expected_value(p_est, amount_paise, action, prior_contacts=prior)
        evs.append(ev)

    # EV must strictly decrease: ev0 > ev1 > ev2 > ev3
    assert evs[0] > evs[1] > evs[2] > evs[3], f"EV must strictly decrease with prior contacts: {evs}"

