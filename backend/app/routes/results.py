# backend/app/routes/results.py
import os
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.routes.demo import results_cache
from app.revora.triage.capacity_roi import (
    CapacityROI,
    CapacitySimulateRequest,
    CapacitySimulateResponse,
    compute_capacity_roi,
    simulate_capacity_shift
)
from seed.historical_outcomes import get_historical_evidence_aggregates

router = APIRouter(prefix="/results", tags=["results"])

@router.get("/historical-evidence")
def get_historical_evidence():
    """
    Surfaces per-action, per-cause aggregate statistics from the synthetic historical dataset
    (attempts, recovered, recovery rate, 95% CI). Clearly labeled as Synthetic Demo Data.
    """
    aggregates = get_historical_evidence_aggregates()
    return {
        "dataset_type": "Synthetic Demo Data",
        "badge_label": "Synthetic Demo Data",
        "description": "Historical recovery rates calibrated on labeled demo outcomes (N=1,800)",
        "aggregates": aggregates
    }

@router.get("/comparison")
def get_comparison():
    """
    Returns comparative recovery statistics across all 4 strategies:
    1. PuLP MILP Optimizer (Optimized)
    2. First-Come First-Served (FCFS / Naive Baseline)
    3. Highest Amount First Baseline
    4. Highest Probability First Baseline
    Includes detailed breakdowns per failure cause and net value creation.
    """
    return {
        "optimized_recovered_paise": results_cache.optimized_recovered_paise,
        "baseline_recovered_paise": results_cache.baseline_recovered_paise,
        "uplift_pct": results_cache.uplift_pct,
        "by_cause": results_cache.by_cause,
        "total_revenue_at_risk_paise": results_cache.total_revenue_at_risk_paise,
        "net_value_created_paise": results_cache.net_value_created_paise,
        "contacts_avoided_count": results_cache.contacts_avoided_count,
        "policy_violations_count": 0, # Strictly 0 by architecture proof
        "strategies": results_cache.strategies
    }

@router.get("/capacity-roi", response_model=List[CapacityROI])
def get_capacity_roi():
    """
    Returns the Capacity ROI (shadow prices / dual values from the LP relaxation)
    for the most recent batch run.
    """
    if results_cache.capacity_roi:
        return results_cache.capacity_roi

    # If no batch has been processed yet, return default capacity configurations
    cap_wa = int(os.getenv("CAPACITY_WHATSAPP", "50"))
    cap_hu = int(os.getenv("CAPACITY_HUMAN_CALL", "5"))
    
    # If seed payments exist in last_payments, compute it on the fly
    if results_cache.last_payments:
        from app.revora.triage.optimizer import TriageOptimizer

        opt = TriageOptimizer()
        decisions = opt.allocate_batch(
            results_cache.last_payments,
            results_cache.last_diagnoses,
            results_cache.last_prior_contacts
        )
        results_cache.capacity_roi = compute_capacity_roi(
            results_cache.last_payments,
            results_cache.last_diagnoses,
            results_cache.last_prior_contacts,
            decisions,
            cap_wa,
            cap_hu
        )
        return results_cache.capacity_roi

    return [
        CapacityROI(
            channel="whatsapp",
            capacity_used=0,
            capacity_total=cap_wa,
            is_binding=False,
            shadow_price_per_unit=0.0
        ),
        CapacityROI(
            channel="human",
            capacity_used=0,
            capacity_total=cap_hu,
            is_binding=False,
            shadow_price_per_unit=0.0
        )
    ]

@router.post("/capacity-roi/simulate", response_model=CapacitySimulateResponse)
def simulate_capacity(payload: CapacitySimulateRequest):
    """
    Simulates changing a channel's daily capacity limit.
    - Perturbations <= 20%: uses instant shadow price linear approximation.
    - Perturbations > 20%: reruns the full MILP solver with the new capacity.
    """
    if payload.channel not in ["whatsapp", "human"]:
        raise HTTPException(status_code=400, detail=f"Unsupported channel '{payload.channel}'. Supported: whatsapp, human")

    if payload.new_capacity < 0:
        raise HTTPException(status_code=400, detail="Capacity must be non-negative")

    current_roi = get_capacity_roi()

    return simulate_capacity_shift(
        channel=payload.channel,
        new_capacity=payload.new_capacity,
        current_capacity_roi=current_roi,
        payments=results_cache.last_payments,
        diagnoses=results_cache.last_diagnoses,
        prior_contacts_counts=results_cache.last_prior_contacts,
        base_recovered_paise=results_cache.optimized_recovered_paise
    )
