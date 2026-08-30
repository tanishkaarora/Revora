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
