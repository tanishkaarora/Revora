# backend/tests/test_commitment_extractor.py
import pytest
from app.revora.execution.commitment_extractor import CommitmentExtractor


def test_commitment_extractor_positive():
    extractor = CommitmentExtractor()
    
    # Test cases that should extract a positive commitment to pay
    cases = [
        "will pay tomorrow morning using the link",
        "kal pay kar dunga pakka",
        "ok doing it now",
        "I will retry later today",
        "will clear it by monday"
    ]
    
    for text in cases:
        commitment = extractor.extract_commitment("pay_test_123", text)
        assert commitment.commits is True, f"Failed to extract commitment from: '{text}'"
        assert commitment.confidence >= 0.5

def test_commitment_extractor_negative():
    extractor = CommitmentExtractor()
    
    # Test cases that should NOT extract a commitment
    cases = [
        "payment failed again and again",
        "stop messaging me",
        "why did my payment fail?",
        "balance cut ho gaya but system decline dikha raha hai",
        "no, not paying",
        "fraud mat karo",
        "nahi karunga"
    ]
    
    for text in cases:
        commitment = extractor.extract_commitment("pay_test_123", text)
        # Verify that it doesn't extract false positives
        if "not paying" in text or "stop" in text or "nahi karunga" in text or "fraud" in text:
            assert commitment.commits is False, f"Erroneously extracted commitment from: '{text}'"

def test_commitment_extractor_fallback_hinglish_friday():
    """
    Specifically tests offline/heuristic fallback commitment extraction on common
    Hinglish affirmatives ('haan', 'theek hai') and weekday references ('Friday', 'parso').
    """
    extractor = CommitmentExtractor()
    
    # Text specifically containing "Friday" and "haan"
    res1 = extractor.extract_commitment("pay_test_001", "haan Friday tak kar dunga")
    assert res1.commits is True, "Failed to recognize 'haan Friday tak kar dunga' as commitment"
    assert res1.promised_date is not None, "Failed to compute best-effort date for Friday"
    assert len(res1.promised_date) == 10, "Date must be in YYYY-MM-DD format"
    assert res1.confidence >= 0.7

    # Additional Hinglish affirmatives & day references
    res2 = extractor.extract_commitment("pay_test_002", "theek hai kal karta hu")
    assert res2.commits is True
    assert res2.promised_date is not None

    res3 = extractor.extract_commitment("pay_test_003", "parso kar dunga")
    assert res3.commits is True
    assert res3.promised_date is not None


def test_commitment_extractor_refusal_english_and_hinglish():
    extractor = CommitmentExtractor()
    
    english_refusals = [
        "No, stop messaging me. I will not pay.",
        "stop messaging me",
        "I will not pay",
        "leave me alone",
        "unsubscribe",
        "opt out",
        "do not contact me again",
        "never contact me again",
        "stop calling and texting",
        "I refuse to pay this"
    ]
    
    for text in english_refusals:
        res = extractor.extract_commitment("pay_test_ref_en", text)
        assert res.refuses is True, f"Failed to detect refusal in English: '{text}'"
        assert res.outcome == "refuses", f"Expected outcome 'refuses' for: '{text}', got '{res.outcome}'"
        assert res.commits is False
        assert res.confidence >= 0.8
        
    hinglish_refusals = [
        "mat message karo",
        "message mat karo mujhe",
        "paise nahi dunga",
        "nahi pay karunga",
        "disturb mat karo",
        "dobara message mat karna",
        "nahi karna payment",
        "band karo ye sab"
    ]
    
    for text in hinglish_refusals:
        res = extractor.extract_commitment("pay_test_ref_hi", text)
        assert res.refuses is True, f"Failed to detect refusal in Hinglish: '{text}'"
        assert res.outcome == "refuses", f"Expected outcome 'refuses' for: '{text}', got '{res.outcome}'"
        assert res.commits is False
        assert res.confidence >= 0.8

def test_commitment_extractor_ambiguous_inquiry():
    extractor = CommitmentExtractor()
    
    ambiguous_texts = [
        "why did my payment fail?",
        "what is this message about?",
        "who is this?",
        "kya hua payment ka?",
        "balance cut ho gaya but decline dikha raha hai"
    ]
    
    for text in ambiguous_texts:
        res = extractor.extract_commitment("pay_test_amb", text)
        assert res.outcome == "ambiguous", f"Expected outcome 'ambiguous' for: '{text}', got '{res.outcome}'"
        assert res.commits is False
        assert res.refuses is False

def test_refused_customer_permanently_suppressed_end_to_end(tmp_path):
    from datetime import datetime
    from app.audit.store import AuditStore
    from app.revora.execution.promise_tracker import PromiseTracker
    from app.guardrail.policy_engine import PolicyEngine
    from app.guardrail.types import FailedPayment, TriageDecision

    db_path = str(tmp_path / "test_refusal_suppression.db")
    store = AuditStore(db_path=db_path)
    tracker = PromiseTracker(store)
    policy_engine = PolicyEngine(store)

    # 1. Setup initial case in store
    case_id = "pay_case_refuse_001"
    cust_id = "cust_refuse_001"
    store.upsert_case({
        "id": case_id,
        "customer_id": cust_id,
        "amount_paise": 249900,
        "method": "upi",
        "error_code": "BAD_REQUEST",
        "error_reason": "Insufficient balance",
        "timestamp": datetime.now().isoformat(),
        "cause": "insufficient_balance",
        "diagnosis_confidence": 1.0,
        "diagnosis_source": "rule",
        "candidate_action": "send_whatsapp_nudge",
        "channel": "whatsapp",
        "expected_value": 1500.0,
        "probability_estimate": 0.6,
        "cost": 500.0,
        "allocated": True,
        "triage_reason": "Ranked #1",
        "outcome": "ALLOW",
        "rule_fired": "none",
        "guardrail_reason": "Passed",
        "lifecycle_state": "CONTACTED",
        "conversation_json": "[]"
    })

    # 2. Simulate customer refusal reply: "No, stop messaging me. I will not pay."
    commitment = tracker.process_reply(case_id, cust_id, "No, stop messaging me. I will not pay.")
    assert commitment.refuses is True
    assert commitment.outcome == "refuses"
    assert commitment.commits is False

    # 3. Verify case in store is permanently suppressed
    updated_case = store.get_case(case_id)
    assert updated_case["lifecycle_state"] == "SUPPRESSED"
    assert updated_case["outcome"] == "BLOCK"
    assert updated_case["rule_fired"] == "customer_opted_out"
    
    # Verify brief acknowledgment message present and NO retry link sent
    conversation = updated_case["conversation"]
    bot_messages = [m for m in conversation if m.get("sender") == "bot"]
    assert len(bot_messages) >= 2 # 1 initial nudge + 1 acknowledgment
    last_bot_reply = bot_messages[-1]["text"]
    assert "Samajh gaye, hum aapko dobara contact nahi karenge" in last_bot_reply
    assert "https://rzp.io/l/retry" not in last_bot_reply

    # 4. Verify distinct opt-out audit log entry exists
    audit_entries = store.get_audit_entries(limit=10)
    optout_entry = next((e for e in audit_entries if e.guardrail_decision.rule_fired == "customer_opted_out"), None)
    assert optout_entry is not None
    assert optout_entry.guardrail_decision.outcome == "BLOCK"

    # 5. Verify customer is marked opted out in store
    assert store.is_customer_opted_out(cust_id) is True

    # 6. Verify policy engine strictly blocks any subsequent outreach attempts to this customer
    new_payment = FailedPayment(
        id="pay_case_refuse_002",
        customer_id=cust_id,
        amount_paise=500000,
        method="card",
        error_code="GATEWAY_ERROR",
        error_reason="Timeout",
        timestamp=datetime.now().isoformat()
    )
    new_triage = TriageDecision(
        failed_payment_id="pay_case_refuse_002",
        candidate_action="send_whatsapp_nudge",
        channel="whatsapp",
        expected_value=3000.0,
        probability_estimate=0.8,
        cost=500.0,
        allocated=True,
        reason="Allocated by optimizer in subsequent run"
    )
    decision = policy_engine.evaluate(new_payment, new_triage, current_time_str="12:00", current_date_str="2026-09-05")
    assert decision.outcome == "BLOCK"
    assert decision.rule_fired == "customer_opted_out"
    assert "refused outreach or opted out" in decision.reason

def test_commitment_extractor_link_requests():
    extractor = CommitmentExtractor()
    
    link_request_texts = [
        "Payment link send kardo alternative, card se abhi kar deta hu.",
        "payment link send kardo",
        "link bhejo please",
        "send me the payment link",
        "share the retry link",
        "link send karo",
        "can you please send the link again?"
    ]
    
    for text in link_request_texts:
        res = extractor.extract_commitment("pay_test_link_req", text)
        assert res.requests_link is True, f"Failed to detect link request for: '{text}'"
        assert res.outcome == "requests_link", f"Expected outcome 'requests_link' for: '{text}', got '{res.outcome}'"
        assert res.commits is False
        assert res.refuses is False

def test_link_request_dispatches_retry_link_end_to_end(tmp_path):
    from datetime import datetime
    from app.audit.store import AuditStore
    from app.revora.execution.promise_tracker import PromiseTracker

    db_path = str(tmp_path / "test_link_req.db")
    store = AuditStore(db_path=db_path)
    tracker = PromiseTracker(store)

    case_id = "pay_case_link_req_001"
    cust_id = "cust_link_req_001"
    store.upsert_case({
        "id": case_id,
        "customer_id": cust_id,
        "amount_paise": 499900,
        "method": "card",
        "error_code": "card_declined",
        "error_reason": "Card declined by bank",
        "timestamp": datetime.now().isoformat(),
        "cause": "card_declined",
        "diagnosis_confidence": 1.0,
        "diagnosis_source": "rule",
        "candidate_action": "suggest_alt_method",
        "channel": "whatsapp",
        "expected_value": 3500.0,
        "probability_estimate": 0.7,
        "cost": 500.0,
        "allocated": True,
        "triage_reason": "Ranked #1",
        "outcome": "ALLOW",
        "rule_fired": "none",
        "guardrail_reason": "Passed",
        "lifecycle_state": "CONTACTED",
        "conversation_json": "[]"
    })

    # Simulate customer asking for payment link
    commitment = tracker.process_reply(case_id, cust_id, "Payment link send kardo alternative, card se abhi kar deta hu.")
    assert commitment.requests_link is True
    assert commitment.outcome == "requests_link"

    # Verify that fresh retry link was dispatched in conversation
    updated_case = store.get_case(case_id)
    conversation = updated_case["conversation"]
    bot_messages = [m for m in conversation if m.get("sender") == "bot"]
    assert len(bot_messages) >= 2 # 1 initial nudge + 1 link dispatch
    last_bot_reply = bot_messages[-1]["text"]
    assert f"https://rzp.io/l/retry_{case_id}" in last_bot_reply
    assert "Yeh lijiye aapka payment retry link" in last_bot_reply

