# backend/tests/test_business_invariants.py
import pytest
import os
from datetime import datetime
from app.guardrail.types import FailedPayment, Diagnosis, TriageDecision, GuardrailDecision
from app.guardrail.kill_switch import kill_switch
from app.guardrail.policy_engine import PolicyEngine
from app.audit.store import AuditStore
from app.revora.triage.optimizer import TriageOptimizer
from app.revora.diagnosis.engine import DiagnosisEngine

from seed.seed_data import generate_seed_payments

@pytest.fixture
def clean_store():
    import uuid
    db_path = f"./data/test_inv_{uuid.uuid4().hex[:8]}.db"
    store = AuditStore(db_path=db_path)
    yield store
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass

def test_capacity_invariant_full_batch(monkeypatch):
    """
    Capacity Invariant: Across a full batch of 60 cases, allocated actions
    NEVER exceed configured channel capacity limits (WhatsApp <= 12, Human <= 3).
    """
    monkeypatch.setenv("CAPACITY_WHATSAPP", "12")
    monkeypatch.setenv("CAPACITY_HUMAN_CALL", "3")
    monkeypatch.setenv("FAIRNESS_FLOOR_SLOTS", "2")

    optimizer = TriageOptimizer()
    payments = generate_seed_payments(count=60)
    diagnosis_engine = DiagnosisEngine()

    diagnoses = {p.id: diagnosis_engine.diagnose(p) for p in payments}
    prior_contacts = {p.customer_id: 0 for p in payments}

    decisions = optimizer.allocate_batch(payments, diagnoses, prior_contacts)

    whatsapp_allocated = sum(1 for d in decisions if d.allocated and d.channel == "whatsapp")
    human_allocated = sum(1 for d in decisions if d.allocated and d.channel == "human")

    assert len(decisions) == len(payments), "Every case in batch must receive a decision"
    assert whatsapp_allocated <= 12, f"WhatsApp allocated ({whatsapp_allocated}) exceeded limit of 12"
    assert human_allocated <= 3, f"Human allocated ({human_allocated}) exceeded limit of 3"


def test_promise_invariant_full_batch(clean_store):
    """
    Promise Invariant: A customer with an active unexpired promise to pay
    never receives an active outreach contact action in the batch.
    """
    store = clean_store
    policy_engine = PolicyEngine(store)
    diagnosis_engine = DiagnosisEngine()
    optimizer = TriageOptimizer()

    # Pre-seed active pending promises for customers
    promised_cust_1 = "cust_promise_vip_1"
    promised_cust_2 = "cust_promise_vip_2"

    store.create_or_update_promise(
        failed_payment_id="pay_prev_001",
        customer_id=promised_cust_1,
        promised_date=datetime.now().strftime("%Y-%m-%d"),
        confidence=0.95,
        status="pending",
        raw_reply="kal pay kar dunga",
        timestamp=datetime.now().isoformat()
    )

    store.create_or_update_promise(
        failed_payment_id="pay_prev_002",
        customer_id=promised_cust_2,
        promised_date="2099-12-31",
        confidence=0.90,
        status="pending",
        raw_reply="will pay by next week",
        timestamp=datetime.now().isoformat()
    )

    # Generate test batch containing payments for these promised customers
    test_payments = [
        FailedPayment(
            id="pay_test_p1", customer_id=promised_cust_1, amount_paise=500000,
            method="upi", error_code="insufficient_balance", error_reason="Low balance",
            timestamp=datetime.now().isoformat()
        ),
        FailedPayment(
            id="pay_test_p2", customer_id=promised_cust_2, amount_paise=800000,
            method="card", error_code="card_declined", error_reason="Do not honor",
            timestamp=datetime.now().isoformat()
        )
    ]

    diagnoses = {p.id: diagnosis_engine.diagnose(p) for p in test_payments}
    prior_contacts = {p.customer_id: 0 for p in test_payments}

    decisions = optimizer.allocate_batch(test_payments, diagnoses, prior_contacts)

    for p, dec in zip(test_payments, decisions):
        # Force candidate action to outreach to test guardrail blocking
        dec.candidate_action = "send_whatsapp_nudge"
        dec.allocated = True
        guard_dec = policy_engine.evaluate(p, dec, current_time_str="12:00")

        assert guard_dec.outcome == "BLOCK", f"Promise invariant violated for {p.customer_id}: allowed outreach!"
        assert guard_dec.rule_fired == "promise_pending"

def test_kill_switch_invariant_full_batch(clean_store):
    """
    Kill-Switch Invariant: When the kill switch is active, zero executable actions succeed
    across an entire batch (100% of cases are BLOCK with rule_fired='kill_switch_active').
    """
    store = clean_store
    policy_engine = PolicyEngine(store)
    diagnosis_engine = DiagnosisEngine()
    optimizer = TriageOptimizer()

    payments = generate_seed_payments(count=30)
    diagnoses = {p.id: diagnosis_engine.diagnose(p) for p in payments}
    prior_contacts = {p.customer_id: 0 for p in payments}

    decisions = optimizer.allocate_batch(payments, diagnoses, prior_contacts)

    try:
        kill_switch.set_active(True)
        assert kill_switch.is_active() is True

        for p, dec in zip(payments, decisions):
            guard_dec = policy_engine.evaluate(p, dec)
            assert guard_dec.outcome == "BLOCK", "Kill switch must block all actions"
            assert guard_dec.rule_fired == "kill_switch_active"
    finally:
        kill_switch.set_active(False)

def test_accounting_invariant_reconciliation():
    """
    Accounting Invariant: Reconciles financial metrics mathematically:
    Net Value = Recovered Amount - (Direct Costs + Fatigue Costs).
    """
    from app.revora.triage.expected_value import calculate_expected_value, get_action_cost, get_fatigue_cost


    amount_paise = 350000 # ₹3,500
    p_est = 0.70
    action = "send_whatsapp_nudge"
    prior = 2

    direct_cost = get_action_cost(action, amount_paise)
    fatigue_cost = get_fatigue_cost(action, prior)
    expected_net_value = calculate_expected_value(p_est, amount_paise, action, prior_contacts=prior)

    expected_gross = p_est * amount_paise
    reconciled_env = round(expected_gross - direct_cost - fatigue_cost, 2)

    assert expected_net_value == reconciled_env, f"Accounting discrepancy: {expected_net_value} vs {reconciled_env}"
