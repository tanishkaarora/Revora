# backend/tests/test_policy_engine.py
import pytest
from datetime import datetime
from app.audit.store import AuditStore
from app.guardrail.kill_switch import kill_switch
from app.guardrail.policy_engine import PolicyEngine
from app.guardrail.types import FailedPayment, TriageDecision, AuditLogEntry, Diagnosis, GuardrailDecision
from app.revora.execution.promise_tracker import PromiseTracker


@pytest.fixture
def test_db():
    # Use a temp database for testing
    store = AuditStore(db_path="./data/test_recovery.db")
    store.clear_all()
    yield store
    # Cleanup after test
    try:
        import os
        if os.path.exists("./data/test_recovery.db"):
            os.remove("./data/test_recovery.db")
    except Exception:
        pass

@pytest.fixture
def sample_payment():
    return FailedPayment(
        id="pay_test_001",
        customer_id="cust_test_001",
        amount_paise=100000, # ₹1,000
        method="upi",
        error_code="BAD_REQUEST_PAYMENT_ACCOUNT_INSUFFICIENT_FUNDS",
        error_reason="Insufficient balance",
        timestamp=datetime.now().isoformat()
    )

@pytest.fixture
def sample_triage():
    return TriageDecision(
        failed_payment_id="pay_test_001",
        candidate_action="send_whatsapp_nudge",
        channel="whatsapp",
        expected_value=400.0,
        probability_estimate=0.9,
        cost=500.0,
        allocated=True,
        reason="Allocated by test triage"
    )

def test_guardrail_allow(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    # Ensure kill switch is false
    kill_switch.set_active(False)
    
    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="12:00", # daytime
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "ALLOW"
    assert decision.rule_fired == "none"

def test_guardrail_kill_switch(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    # Flip kill switch
    kill_switch.set_active(True)
    
    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="12:00",
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "kill_switch_active"
    # Reset
    kill_switch.set_active(False)

def test_guardrail_contact_cap(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    kill_switch.set_active(False)
    
    # Pre-add 3 allowed contact logs to the audit store for this customer
    # This should trigger contact cap limit (MAX_CONTACTS = 3)
    for i in range(3):
        mock_payment = FailedPayment(
            id=f"pay_prev_{i}",
            customer_id=sample_payment.customer_id,
            amount_paise=100000,
            method="upi",
            error_code="incorrect_otp",
            error_reason="Wrong OTP",
            timestamp=datetime.now().isoformat()
        )
        mock_triage = TriageDecision(
            failed_payment_id=mock_payment.id,
            candidate_action="send_whatsapp_nudge",
            channel="whatsapp",
            expected_value=100.0,
            probability_estimate=0.5,
            cost=500.0,
            allocated=True,
            reason="Allocated"
        )
        mock_guard = GuardrailDecision(
            failed_payment_id=mock_payment.id,
            outcome="ALLOW",
            rule_fired="none",
            reason="Passed",
            timestamp=datetime.now().isoformat()
        )
        entry = AuditLogEntry(
            id=f"audit_prev_{i}",
            failed_payment=mock_payment,
            diagnosis=Diagnosis(failed_payment_id=mock_payment.id, cause="wrong_otp", confidence=1.0, source="rule", evidence={}),
            triage_decision=mock_triage,
            guardrail_decision=mock_guard,
            timestamp=datetime.now().isoformat()
        )
        test_db.add_audit_entry(entry)

    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="12:00",
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "contact_cap_exceeded"

def test_guardrail_quiet_hours(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    kill_switch.set_active(False)
    
    # 1. Active nudge during quiet hours (23:00) -> BLOCKED
    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="23:00",
        current_date_str="2026-08-28"
    )
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "quiet_hours"

    # 2. Silent retry during quiet hours (23:00) -> ALLOWED (silent retry has no customer outreach)
    silent_triage = TriageDecision(
        failed_payment_id=sample_payment.id,
        candidate_action="silent_retry",
        channel="retry",
        expected_value=800.0,
        probability_estimate=0.8,
        cost=0.0,
        allocated=True,
        reason="Allocated retry"
    )
    decision_retry = engine.evaluate(
        payment=sample_payment,
        triage=silent_triage,
        current_time_str="23:00",
        current_date_str="2026-08-28"
    )
    assert decision_retry.outcome == "ALLOW"

def test_guardrail_promise_pending(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    kill_switch.set_active(False)
    
    # Create active promise for customer due on 2026-08-30
    test_db.create_or_update_promise(
        failed_payment_id="pay_test_000",
        customer_id=sample_payment.customer_id,
        promised_date="2026-08-30",
        confidence=0.9,
        status="pending",
        raw_reply="will pay by sunday",
        timestamp=datetime.now().isoformat()
    )

    # Evaluate on current date 2026-08-28 (promise is still pending and not yet due)
    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="12:00",
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "promise_pending"

def test_guardrail_refund_escalation(test_db, sample_payment):
    engine = PolicyEngine(test_db)
    kill_switch.set_active(False)
    
    # Action: issue_refund, Amount: ₹8,000 (800,000 paise) which exceeds refund threshold ₹5,000 (500,000 paise)
    refund_payment = FailedPayment(
        id=sample_payment.id,
        customer_id=sample_payment.customer_id,
        amount_paise=800000, 
        method=sample_payment.method,
        error_code=sample_payment.error_code,
        error_reason=sample_payment.error_reason,
        timestamp=sample_payment.timestamp
    )
    
    refund_triage = TriageDecision(
        failed_payment_id=sample_payment.id,
        candidate_action="issue_refund",
        channel="refund",
        expected_value=-800000.0,
        probability_estimate=1.0,
        cost=800000.0,
        allocated=True,
        reason="Assigned refund"
    )
    
    decision = engine.evaluate(
        payment=refund_payment,
        triage=refund_triage,
        current_time_str="12:00",
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "ESCALATE"
    assert decision.rule_fired == "refund_signature_required"

def test_guardrail_opt_out(test_db, sample_payment, sample_triage):
    engine = PolicyEngine(test_db)
    kill_switch.set_active(False)
    
    # Store opt-out status for this customer
    test_db.create_or_update_promise(
        failed_payment_id="pay_test_optout",
        customer_id=sample_payment.customer_id,
        promised_date=None,
        confidence=0.95,
        status="opted_out",
        raw_reply="stop messaging me",
        timestamp=datetime.now().isoformat()
    )

    decision = engine.evaluate(
        payment=sample_payment,
        triage=sample_triage,
        current_time_str="12:00",
        current_date_str="2026-08-28"
    )
    
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "customer_opted_out"
    assert "refused outreach or opted out" in decision.reason
