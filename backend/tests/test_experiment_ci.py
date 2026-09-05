import pytest
import math
import httpx
from app.main import app
from app.routes.demo import compute_wilson_ci

def get_async_client():
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")

def test_wilson_ci_hand_computed_examples():
    """
    Verifies Wilson score confidence interval calculation against hand-computed examples.
    """
    # Example 1: n = 100, k = 50 (p_hat = 0.50)
    # Hand computation:
    # z = 1.96, z^2 = 3.8416
    # Denominator = 1 + 3.8416/100 = 1.038416
    # Centre = (0.50 + 3.8416/200) / 1.038416 = 0.519208 / 1.038416 = 0.500000
    # Sqrt term = sqrt(0.25/100 + 3.8416/40000) = sqrt(0.0025 + 0.00009604) = sqrt(0.00259604) = 0.05095135
    # Margin = 1.96 * 0.05095135 / 1.038416 = 0.0998646 / 1.038416 = 0.096170
    # Lower = 0.50 - 0.096170 = 0.40383 -> 0.4038
    # Upper = 0.50 + 0.096170 = 0.59617 -> 0.5962
    lower, upper = compute_wilson_ci(50, 100)
    assert lower == 0.4038
    assert upper == 0.5962

    # Example 2: n = 50, k = 26 (p_hat = 0.52)
    # Hand computation:
    # Denominator = 1 + 3.8416/50 = 1.076832
    # Centre = (0.52 + 3.8416/100) / 1.076832 = 0.558416 / 1.076832 = 0.518573
    # Sqrt term = sqrt(0.52 * 0.48 / 50 + 3.8416 / 10000) = sqrt(0.004992 + 0.00038416) = sqrt(0.00537616) = 0.0733223
    # Margin = 1.96 * 0.0733223 / 1.076832 = 0.1437117 / 1.076832 = 0.133458
    # Lower = 0.518573 - 0.133458 = 0.385115 -> 0.3851
    # Upper = 0.518573 + 0.133458 = 0.652031 -> 0.6520
    lower_50, upper_50 = compute_wilson_ci(26, 50)
    assert lower_50 == 0.3851
    assert upper_50 == 0.6520

    # Boundary cases: n = 0, k = 0
    lower_zero, upper_zero = compute_wilson_ci(0, 0)
    assert lower_zero == 0.0
    assert upper_zero == 0.0

    # Bounds: always between 0.0 and 1.0
    lower_full, upper_full = compute_wilson_ci(100, 100)
    assert lower_full > 0.95
    assert upper_full == 1.0

@pytest.mark.anyio
async def test_run_experiment_ci_structure(monkeypatch):
    """
    Verifies that the /demo/run-experiment endpoint:
    1. Draws directly from the active seeded batch matching target causes
    2. Satisfies requested N=120 when eligible pool >= 120 (e.g. sample_size=120)
    3. Transparently returns requested_n, available_matching_count, and cohort_explanation
    4. Computes tight Wilson score confidence intervals
    """
    monkeypatch.delenv("DEMO_SECRET", raising=False)
    async with get_async_client() as client:
        # First ensure a batch of 210 cases is seeded
        await client.post("/demo/seed-batch?limit=210")

        response = await client.post("/demo/run-experiment?count=120")
        assert response.status_code == 200
        data = response.json()
        
        assert data["experiment_name"] == "Simulated Holdout Experiment"
        assert "is_inconclusive" in data
        assert "group_a" in data
        assert "group_b" in data
        assert "available_matching_count" in data
        assert "requested_n" in data
        assert "cohort_explanation" in data
        
        # When 210 cases are seeded, ~126-135 match the 3 target causes
        assert data["available_matching_count"] >= 100
        # When requesting N=120, exactly min(120, available_matching_count) is evaluated
        assert data["sample_size"] == min(120, data["available_matching_count"])
        assert data["group_a"]["attempts"] + data["group_b"]["attempts"] == data["sample_size"]
        assert data["group_a"]["attempts"] == 60 or data["group_a"]["attempts"] >= 50
        
        for group_key in ["group_a", "group_b"]:
            group = data[group_key]
            assert "ci_lower" in group
            assert "ci_upper" in group
            assert "ci_display" in group
            assert group["ci_lower"] <= group["ci_upper"]
            assert "%" in group["ci_display"]
            # With N>=50 per arm, confidence interval width (upper - lower) is tight (<= 0.30)
            ci_width = group["ci_upper"] - group["ci_lower"]
            assert ci_width <= 0.30, f"Expected tight CI width <= 0.30, got {ci_width}"
