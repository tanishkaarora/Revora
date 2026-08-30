# backend/tests/test_probability_model.py
import pytest
from app.revora.triage.probability_model import RecoveryProbabilityModel, BASE_PROBABILITIES

from seed.historical_outcomes import generate_historical_outcomes, get_historical_evidence_aggregates

def test_historical_dataset_generation():
    records = generate_historical_outcomes(sample_size=100)
    assert len(records) == 100
    for r in records:
        assert "cause" in r
        assert "action_type" in r
        assert "recovered" in r
        assert r["recovered"] in [0, 1]

    aggregates = get_historical_evidence_aggregates()
    assert len(aggregates) > 0
    for agg in aggregates:
        assert agg["attempts"] >= 0
        assert 0.0 <= agg["recovery_rate"] <= 1.0
        assert agg["ci_lower"] <= agg["recovery_rate"] <= agg["ci_upper"]

def test_probability_model_bounds_and_monotonicity():
    model = RecoveryProbabilityModel(load_historical=True)
    
    # Check that bank_timeout + silent_retry yields high probability
    p_bt_retry = model.estimate_probability("bank_timeout", "silent_retry", 0)
    assert 0.65 <= p_bt_retry <= 0.95
    
    # Check that wrong_otp + silent_retry yields very low probability
    p_otp_retry = model.estimate_probability("wrong_otp", "silent_retry", 0)
    assert p_otp_retry < 0.15

    # Check monotonicity with increasing prior contacts
    p0 = model.estimate_probability("insufficient_balance", "send_whatsapp_nudge", 0)
    p1 = model.estimate_probability("insufficient_balance", "send_whatsapp_nudge", 1)
    p2 = model.estimate_probability("insufficient_balance", "send_whatsapp_nudge", 2)
    p3 = model.estimate_probability("insufficient_balance", "send_whatsapp_nudge", 3)

    assert 0.0 < p3 < p2 < p1 < p0 <= 1.0, f"Probabilities must strictly decrease with contact fatigue: {p0}, {p1}, {p2}, {p3}"

def test_probability_model_confidence_intervals():
    model = RecoveryProbabilityModel(load_historical=True)
    
    p_est, ci_lower, ci_upper = model.estimate_probability_with_ci("insufficient_balance", "send_whatsapp_nudge", 0)
    assert 0.0 <= ci_lower <= p_est <= ci_upper <= 1.0
    assert (ci_upper - ci_lower) < 0.35, "Confidence interval width should be tight given 1500 historical samples"

def test_probability_model_fallback():
    # Test model initialized without historical data fits priors perfectly
    model = RecoveryProbabilityModel(load_historical=False)
    p_est = model.estimate_probability("bank_timeout", "silent_retry", 0)
    expected = BASE_PROBABILITIES["bank_timeout"]["silent_retry"]
    assert abs(p_est - expected) < 0.05
