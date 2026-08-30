# backend/tests/test_groq_provider.py
import os
import pytest
from unittest.mock import MagicMock, patch
from app.llm import get_llm_provider
from app.llm.groq_provider import GroqProvider

def test_groq_provider_missing_key_raises_error(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    
    with pytest.raises(ValueError) as exc_info:
        get_llm_provider()
    
    assert "CRITICAL STARTUP ERROR" in str(exc_info.value)
    assert "GROQ_API_KEY is missing or empty" in str(exc_info.value)

def test_groq_provider_initialization(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_1234567890")
    monkeypatch.setenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    provider = get_llm_provider()
    assert isinstance(provider, GroqProvider)
    assert provider.model == "llama-3.1-8b-instant"
    assert provider.api_key == "gsk_test_1234567890"

def test_groq_provider_fallback_classification():
    provider = GroqProvider(api_key="gsk_dummy_key", model="llama-3.1-8b-instant")
    
    # Test fallback classification heuristics without network call
    cause, conf = provider._fallback_classify("BAD_REQUEST", "Customer had insufficient balance")
    assert cause == "insufficient_balance"
    assert conf >= 0.5

    cause, conf = provider._fallback_classify("GATEWAY_TIMEOUT", "Bank gateway timed out during processing")
    assert cause == "bank_timeout"
    assert conf >= 0.5

    cause, conf = provider._fallback_classify("INVALID_OTP", "Entered OTP was incorrect")
    assert cause == "wrong_otp"
    assert conf >= 0.5

def test_groq_provider_fallback_message():
    provider = GroqProvider(api_key="gsk_dummy_key", model="llama-3.1-8b-instant")
    msg = provider._fallback_message("Rohan", 1500.0, "https://rzp.io/l/test", "insufficient_balance")
    assert "Rohan" in msg
    assert "1500.00" in msg
    assert "https://rzp.io/l/test" in msg

def test_groq_provider_fallback_commitment():
    provider = GroqProvider(api_key="gsk_dummy_key", model="llama-3.1-8b-instant")
    commits, p_date, conf = provider._fallback_commitment("kal pay kar dunga pakka")
    assert commits is True
    assert p_date is not None
    assert conf >= 0.5

    commits, p_date, conf = provider._fallback_commitment("no, not paying, stop calling")
    assert commits is False
