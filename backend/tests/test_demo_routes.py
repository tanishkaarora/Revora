# backend/tests/test_demo_routes.py
import pytest
import httpx
from app.main import app

def get_async_client():
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")

@pytest.mark.anyio
async def test_demo_secret_protection_when_set(monkeypatch):
    monkeypatch.setenv("DEMO_SECRET", "super-secret-key-123")
    async with get_async_client() as client:
        # 1. Request without header -> 403
        res_no_header = await client.post("/demo/trigger-adversarial-case")
        assert res_no_header.status_code == 403
        assert "Invalid or missing X-Demo-Secret header" in res_no_header.json()["detail"]

        # 2. Request with wrong header -> 403
        res_wrong = await client.post("/demo/trigger-adversarial-case", headers={"X-Demo-Secret": "wrong"})
        assert res_wrong.status_code == 403

        # 3. Request with correct header -> 200
        res_correct = await client.post("/demo/trigger-adversarial-case", headers={"X-Demo-Secret": "super-secret-key-123"})
        assert res_correct.status_code == 200
        data = res_correct.json()
        assert data["status"] == "processed"
        assert data["case"]["id"] == "pay_adv_inj_001"

@pytest.mark.anyio
async def test_demo_secret_protection_when_unset(monkeypatch):
    monkeypatch.delenv("DEMO_SECRET", raising=False)
    async with get_async_client() as client:
        # When DEMO_SECRET is unset, calls should succeed without header
        res = await client.post("/demo/trigger-adversarial-case")
        assert res.status_code == 200
        assert res.json()["status"] == "processed"
        assert res.json()["case"]["id"] == "pay_adv_inj_001"

@pytest.mark.anyio
async def test_adversarial_case_data_matches_real_response(monkeypatch):
    monkeypatch.delenv("DEMO_SECRET", raising=False)
    async with get_async_client() as client:
        res = await client.post("/demo/trigger-adversarial-case")
        assert res.status_code == 200
        case_data = res.json()["case"]
        
        assert case_data["id"] == "pay_adv_inj_001"
        assert "SYSTEM OVERRIDE" in case_data["error_reason"]
        assert case_data["cause"] == "bank_timeout"
        assert case_data["outcome"] in ["ALLOW", "BLOCK", "ESCALATE"]
        assert "guardrail_reason" in case_data
