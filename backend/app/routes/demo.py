# backend/app/routes/demo.py
import time
import asyncio
import hashlib
import os
import json
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Header, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, Tuple, List
from app.audit.store import AuditStore
from app.guardrail.kill_switch import kill_switch
from app.guardrail.types import FailedPayment, AuditLogEntry, RecoveryOutcome, LifecycleState
from app.guardrail.policy_engine import PolicyEngine
from app.revora.diagnosis.engine import DiagnosisEngine
from app.revora.triage.optimizer import TriageOptimizer
from app.revora.triage.baseline import BaselineTriage
from app.revora.triage.expected_value import get_action_cost, get_fatigue_cost
from app.revora.triage.probability_model import RecoveryProbabilityModel
from app.revora.execution.conversation_generator import ConversationGenerator
from app.revora.execution.razorpay_client import RazorpayClient
from app.revora.execution.promise_tracker import PromiseTracker

from app.websocket.manager import manager

router = APIRouter(prefix="/demo", tags=["demo"])
store = AuditStore()
diagnosis_engine = DiagnosisEngine()
optimizer = TriageOptimizer()
baseline_triage = BaselineTriage()
conv_generator = ConversationGenerator()
razorpay_client = RazorpayClient()

def verify_demo_secret(x_demo_secret: Optional[str] = Header(None, alias="X-Demo-Secret")):
    expected_secret = os.environ.get("DEMO_SECRET")
    if expected_secret:
        if not x_demo_secret or x_demo_secret != expected_secret:
            raise HTTPException(status_code=403, detail="Invalid or missing X-Demo-Secret header")

# Global variables to cache comparative results
class ResultsCache:
    def __init__(self):
        self.optimized_recovered_paise = 0
        self.baseline_recovered_paise = 0
        self.uplift_pct = 0.0
        self.by_cause = {}
        self.is_running = False
        self.capacity_roi = []
        self.last_payments = []
        self.last_diagnoses = {}
        self.last_prior_contacts = {}
        self.last_outcomes = []
        self.total_revenue_at_risk_paise = 0
        self.net_value_created_paise = 0
        self.contacts_avoided_count = 0
        self.strategies = {}

results_cache = ResultsCache()

# Failure injection states
failure_flags = {
    "llm_timeout": False,
    "razorpay_error": False
}

class KillSwitchPayload(BaseModel):
    active: bool

class FailureInjectionPayload(BaseModel):
    failure_type: str  # "llm_timeout" | "razorpay_error" | "none"

# Ground truth recovery probability calculation with independent perturbation (Fixes circular evaluation)
def get_ground_truth_recovery_probability(cause: str, action: str, amount_paise: int, prior_contacts: int, payment_id: str) -> float:
    """
    Computes an independently perturbed ground-truth probability for outcome simulation.
    Breaks the circular evaluation flaw where the simulator evaluates the optimizer
    against the optimizer's own predicted probability.
    """
    if action == "suppress" or action == "issue_refund":
        return 0.0

    base_rates = {
        ("bank_timeout", "silent_retry"): 0.82,
        ("bank_timeout", "send_whatsapp_nudge"): 0.38,
        ("bank_timeout", "suggest_alt_method"): 0.35,
        ("bank_timeout", "escalate_human"): 0.48,
        ("insufficient_balance", "silent_retry"): 0.06,
        ("insufficient_balance", "send_whatsapp_nudge"): 0.64,
        ("insufficient_balance", "suggest_alt_method"): 0.68,
        ("insufficient_balance", "escalate_human"): 0.82,
        ("wrong_otp", "silent_retry"): 0.02,
        ("wrong_otp", "send_whatsapp_nudge"): 0.74,
        ("wrong_otp", "suggest_alt_method"): 0.69,
        ("wrong_otp", "escalate_human"): 0.84,
        ("card_declined", "silent_retry"): 0.05,
        ("card_declined", "send_whatsapp_nudge"): 0.54,
        ("card_declined", "suggest_alt_method"): 0.73,
        ("card_declined", "escalate_human"): 0.79,
        ("expired_mandate", "silent_retry"): 0.03,
        ("expired_mandate", "send_whatsapp_nudge"): 0.39,
        ("expired_mandate", "suggest_alt_method"): 0.58,
        ("expired_mandate", "escalate_human"): 0.72,
        ("unknown", "silent_retry"): 0.08,
        ("unknown", "send_whatsapp_nudge"): 0.38,
        ("unknown", "suggest_alt_method"): 0.42,
        ("unknown", "escalate_human"): 0.58,
    }
    
    base_p = base_rates.get((cause, action), 0.15)
    
    # Fatigue penalty in ground truth environment
    if action != "silent_retry":
        fatigue_factor = max(0.20, 1.0 - (0.18 * prior_contacts))
    else:
        fatigue_factor = 1.0

    # Deterministic noise from SHA256 of payment ID and action
    h = hashlib.sha256(f"truth_draw_{payment_id}_{action}".encode()).hexdigest()
    noise = (int(h[:6], 16) / 16777215.0 - 0.5) * 0.08
    
    true_p = (base_p * fatigue_factor) + noise
    return max(0.01, min(0.98, true_p))

def simulate_recovery_outcome(payment_id: str, action: str, cause: str = "unknown", amount_paise: int = 100000, prior_contacts: int = 0) -> Tuple[bool, float]:
    if action == "suppress" or action == "issue_refund":
        return False, 0.0

        
    true_p = get_ground_truth_recovery_probability(cause, action, amount_paise, prior_contacts, payment_id)
    
    h = hashlib.sha256(f"outcome_{payment_id}".encode()).hexdigest()
    val = int(h[:6], 16) / 16777215.0
    
    if val < true_p:
        return True, 1.0
    return False, 0.0

async def process_batch_background(payments: list, delay_ms: int = 20):
    """
    Simulates batch ingestion, running optimized and baseline paths in parallel,
    with continuous per-case WebSocket progress broadcasts driven by actual completed case count.
    """
    results_cache.is_running = True
    total_cases = len(payments)
    
    try:
        # Broadcast Stage 1: Ingesting
        await manager.broadcast({
            "type": "stage_update",
            "data": {
                "stage": "Ingesting", 
                "progress": 2, 
                "completed": 0,
                "total": total_cases,
                "description": f"Ingesting {total_cases} payment failure webhook events"
            }
        })
        
        total_revenue_at_risk = sum(p.amount_paise for p in payments)
        results_cache.total_revenue_at_risk_paise = total_revenue_at_risk

        # 1. Reset metrics
        opt_recovered = 0
        opt_costs = 0
        opt_fatigue_costs = 0
        cause_breakdown = {}

        from seed.seed_data import FAILURE_REASONS
        for cause in FAILURE_REASONS.keys():
            cause_breakdown[cause] = {
                "optimized": 0, "fcfs": 0, "highest_amount": 0, "highest_probability": 0
            }
        cause_breakdown["unknown"] = {
            "optimized": 0, "fcfs": 0, "highest_amount": 0, "highest_probability": 0
        }

        # Broadcast Stage 2: Diagnosing
        await manager.broadcast({
            "type": "stage_update",
            "data": {
                "stage": "Diagnosing", 
                "progress": 4, 
                "completed": 0,
                "total": total_cases,
                "description": "Classifying root failure causes via rule engine (with LLM fallback)"
            }
        })

        # 2. Pre-diagnose all payments in thread worker to avoid blocking event loop
        def _run_all_diagnoses():
            d_map = {}
            for p in payments:
                if failure_flags["llm_timeout"]:
                    d_map[p.id] = diagnosis_engine.diagnose(
                        FailedPayment(
                            id=p.id, customer_id=p.customer_id, amount_paise=p.amount_paise,
                            method=p.method, error_code="LLM_INJECTED_TIMEOUT", error_reason="Timeout failure injected",
                            timestamp=p.timestamp
                        )
                    )
                else:
                    d_map[p.id] = diagnosis_engine.diagnose(p)
            return d_map

        diagnoses = await asyncio.to_thread(_run_all_diagnoses)

        # Initial prior contacts count
        prior_contacts = {p.customer_id: 0 for p in payments}

        # Broadcast Stage 3 & 4: Scoring & Optimizing
        await manager.broadcast({
            "type": "stage_update",
            "data": {
                "stage": "Scoring & Optimizing", 
                "progress": 6, 
                "completed": 0,
                "total": total_cases,
                "description": "Computing Bayesian recovery probabilities and solving PuLP MILP"
            }
        })

        # 3. Solve optimization (Triage) via thread worker
        opt_decisions = await asyncio.to_thread(optimizer.allocate_batch, payments, diagnoses, prior_contacts)
        opt_decisions_map = {d.failed_payment_id: d for d in opt_decisions}

        # Store batch references and compute Capacity ROI (LP relaxation shadow prices)
        results_cache.last_payments = payments
        results_cache.last_diagnoses = diagnoses
        results_cache.last_prior_contacts = prior_contacts

        try:
            from app.revora.triage.capacity_roi import compute_capacity_roi

            results_cache.capacity_roi = await asyncio.to_thread(
                compute_capacity_roi,
                payments=payments,
                diagnoses=diagnoses,
                prior_contacts_counts=prior_contacts,
                milp_decisions=opt_decisions,
                capacity_whatsapp=optimizer.capacity_whatsapp,
                capacity_human=optimizer.capacity_human,
                fairness_floor_slots=optimizer.fairness_floor_slots
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Capacity ROI computation error: {e}")

        # 4. Run Baseline allocations for multi-baseline comparison via thread workers
        fcfs_decisions = await asyncio.to_thread(baseline_triage.allocate_batch_fcfs, payments, diagnoses, prior_contacts)
        fcfs_map = {d.failed_payment_id: d for d in fcfs_decisions}

        ha_decisions = await asyncio.to_thread(baseline_triage.allocate_batch_highest_amount, payments, diagnoses, prior_contacts)
        ha_map = {d.failed_payment_id: d for d in ha_decisions}

        hp_decisions = await asyncio.to_thread(baseline_triage.allocate_batch_highest_prob, payments, diagnoses, prior_contacts)
        hp_map = {d.failed_payment_id: d for d in hp_decisions}

        # Baseline tracking
        fcfs_recovered = 0
        fcfs_costs = 0
        ha_recovered = 0
        ha_costs = 0
        hp_recovered = 0
        hp_costs = 0

        # 5. Process and Broadcast Cases one-by-one with Continuous Progress Updates
        policy_engine = PolicyEngine(
            store=store,
            opt_outs_set=set(),
            contact_counts_map=prior_contacts,
            active_promises_map={}
        )
        batch_outcomes_records = []
        contacts_avoided = 0

        batch_cases_to_save = []
        for i, p in enumerate(payments):
            if kill_switch.is_active():
                await manager.broadcast({
                    "type": "run_terminated",
                    "reason": "Kill switch activated mid-run"
                })
                return

            opt_dec = opt_decisions_map.get(p.id)
            diag = diagnoses[p.id]
            prior_cnt = prior_contacts.get(p.customer_id, 0)

            # Check for degradation injection
            degraded = False
            degradation_reason = None
            if failure_flags["llm_timeout"] or failure_flags["razorpay_error"]:
                degraded = True
                degradation_reason = "Manual failure injection active: LLM timeout / Razorpay Error simulated."

            # Evaluate Guardrail policy on optimized decision
            guard_dec = policy_engine.evaluate(p, opt_dec)

            rec_outcome = None
            convo = []
            payment_link = ""
            lifecycle: LifecycleState = "PRIORITIZED"

            if guard_dec.outcome == "BLOCK":
                lifecycle = "SUPPRESSED"
                contacts_avoided += 1
            elif guard_dec.outcome == "ESCALATE":
                lifecycle = "ESCALATED"
            elif not opt_dec.allocated or opt_dec.candidate_action == "suppress":
                lifecycle = "SUPPRESSED"
                contacts_avoided += 1
            elif guard_dec.outcome == "ALLOW":
                action = opt_dec.candidate_action
                
                # Action cost and fatigue cost
                direct_cost = get_action_cost(action, p.amount_paise)
                fatigue_c = get_fatigue_cost(action, prior_cnt)
                opt_costs += direct_cost
                opt_fatigue_costs += fatigue_c

                if action == "silent_retry":
                    lifecycle = "RETRY"
                    payment_link = "N/A"
                elif action in ["send_whatsapp_nudge", "suggest_alt_method"]:
                    lifecycle = "CONTACTED"
                    if failure_flags["razorpay_error"]:
                        payment_link, is_degraded, err_desc = razorpay_client.create_payment_link(
                            p.amount_paise, f"Retry payment {p.id}", "Customer", customer_contact="+910000000000", mock_mode=False
                        )
                        degraded = True
                        degradation_reason = f"Razorpay API Error injected: {err_desc}"
                    else:
                        from seed.seed_data import get_customer_name
                        c_name = get_customer_name(p.customer_id)
                        payment_link, is_degraded, err_desc = razorpay_client.create_payment_link(
                            p.amount_paise, f"Recovery link for {p.id}", c_name, mock_mode=True
                        )
                        if is_degraded:
                            degraded = True
                            degradation_reason = err_desc
                    
                    # Fast template generation for high-throughput batch simulation
                    msg = conv_generator.generate_nudge(
                        customer_name=get_customer_name(p.customer_id),
                        amount_paise=p.amount_paise,
                        payment_link=payment_link,
                        cause=diag.cause,
                        use_llm=False
                    )
                    convo.append({
                        "sender": "bot",
                        "text": msg,
                        "timestamp": datetime.now().isoformat()
                    })
                elif action == "escalate_human":
                    lifecycle = "CONTACTED"
                elif action == "issue_refund":
                    lifecycle = "ESCALATED"
                    refund_id, is_degraded, err_desc = razorpay_client.issue_refund(f"pay_mock_{p.id}", p.amount_paise, mock_mode=True)
                    if is_degraded:
                        degraded = True
                        degradation_reason = err_desc

                # Simulate recovery outcome using independent perturbed model
                recovered, amt_factor = simulate_recovery_outcome(p.id, action, diag.cause, p.amount_paise, prior_cnt)
                if recovered:
                    lifecycle = "RECOVERED"
                    recovered_amt = p.amount_paise
                    opt_recovered += recovered_amt
                    cause_breakdown[diag.cause]["optimized"] += recovered_amt
                    
                    rec_outcome = RecoveryOutcome(
                        failed_payment_id=p.id,
                        recovered=True,
                        amount_recovered_paise=recovered_amt,
                        cause=diag.cause
                    )
                    
                    if convo:
                        convo.append({
                            "sender": "system",
                            "text": f"Payment of ₹{recovered_amt/100.0:.2f} successfully recovered.",
                            "timestamp": datetime.now().isoformat()
                        })

                batch_outcomes_records.append({
                    "cause": diag.cause,
                    "action": action,
                    "recovered": 1 if recovered else 0
                })

            # Build case data
            from seed.seed_data import get_customer_name
            case_data = {
                "id": p.id,
                "customer_id": p.customer_id,
                "customer_name": get_customer_name(p.customer_id),
                "amount_paise": p.amount_paise,
                "method": p.method,
                "error_code": p.error_code,
                "error_reason": p.error_reason,
                "timestamp": p.timestamp,
                "cause": diag.cause,
                "diagnosis_confidence": diag.confidence,
                "diagnosis_source": diag.source,
                "evidence_json": json.dumps(diag.evidence),
                "candidate_action": opt_dec.candidate_action,
                "channel": opt_dec.channel,
                "expected_value": opt_dec.expected_value,
                "probability_estimate": opt_dec.probability_estimate,
                "cost": opt_dec.cost,
                "allocated": opt_dec.allocated,
                "triage_reason": opt_dec.reason,
                "outcome": guard_dec.outcome,
                "rule_fired": guard_dec.rule_fired,
                "guardrail_reason": guard_dec.reason,
                "lifecycle_state": lifecycle,
                "recovered": rec_outcome.recovered if rec_outcome else False,
                "amount_recovered_paise": rec_outcome.amount_recovered_paise if rec_outcome else 0,
                "conversation_json": json.dumps(convo) if convo else "[]",
                "degraded": degraded,
                "degradation_reason": degradation_reason
            }
            batch_cases_to_save.append(case_data)
            if i < 25 or i % 5 == 0 or recovered:
                await manager.broadcast_audit_entry(case_data)

            # Broadcast progress updates smoothly across all cases
            completed_count = i + 1
            if completed_count % 5 == 0 or completed_count == total_cases:
                progress_percentage = max(6, min(100, int((completed_count / total_cases) * 100)))
                await manager.broadcast({
                    "type": "stage_update",
                    "data": {
                        "stage": "Guardrail & Execution",
                        "progress": progress_percentage,
                        "completed": completed_count,
                        "total": total_cases,
                        "description": f"Evaluating policy & executing ({completed_count}/{total_cases}) · {lifecycle}"
                    }
                })
                await asyncio.sleep(0.015)

            # --- Evaluate Baselines Parallel ---
            # 1. FCFS
            fcfs_dec = fcfs_map.get(p.id)
            fcfs_guard = policy_engine.evaluate(p, fcfs_dec)
            if fcfs_guard.outcome == "ALLOW" and fcfs_dec.allocated:
                fcfs_costs += get_action_cost(fcfs_dec.candidate_action, p.amount_paise)
                fcfs_rec, _ = simulate_recovery_outcome(p.id, fcfs_dec.candidate_action, diag.cause, p.amount_paise, prior_cnt)
                if fcfs_rec:
                    fcfs_recovered += p.amount_paise
                    cause_breakdown[diag.cause]["fcfs"] += p.amount_paise

            # 2. Highest Amount First
            ha_dec = ha_map.get(p.id)
            ha_guard = policy_engine.evaluate(p, ha_dec)
            if ha_guard.outcome == "ALLOW" and ha_dec.allocated:
                ha_costs += get_action_cost(ha_dec.candidate_action, p.amount_paise)
                ha_rec, _ = simulate_recovery_outcome(p.id, ha_dec.candidate_action, diag.cause, p.amount_paise, prior_cnt)
                if ha_rec:
                    ha_recovered += p.amount_paise
                    cause_breakdown[diag.cause]["highest_amount"] += p.amount_paise

            # 3. Highest Probability First
            hp_dec = hp_map.get(p.id)
            hp_guard = policy_engine.evaluate(p, hp_dec)
            if hp_guard.outcome == "ALLOW" and hp_dec.allocated:
                hp_costs += get_action_cost(hp_dec.candidate_action, p.amount_paise)
                hp_rec, _ = simulate_recovery_outcome(p.id, hp_dec.candidate_action, diag.cause, p.amount_paise, prior_cnt)
                if hp_rec:
                    hp_recovered += p.amount_paise
                    cause_breakdown[diag.cause]["highest_probability"] += p.amount_paise

        # Save all cases to store in single fast transaction via thread worker
        await asyncio.to_thread(store.upsert_cases_batch, batch_cases_to_save)

        # 6. Finalize comparative stats
        results_cache.optimized_recovered_paise = opt_recovered
        results_cache.baseline_recovered_paise = fcfs_recovered
        results_cache.last_outcomes = batch_outcomes_records
        results_cache.contacts_avoided_count = contacts_avoided
        results_cache.total_revenue_at_risk_paise = total_revenue_at_risk
        
        net_opt = opt_recovered - (opt_costs + opt_fatigue_costs)
        net_fcfs = fcfs_recovered - fcfs_costs
        results_cache.net_value_created_paise = max(0, net_opt - net_fcfs)

        def calc_uplift(opt_val: int, base_val: int) -> float:
            if base_val > 0:
                return round(((opt_val - base_val) / base_val) * 100.0, 1)
            elif opt_val > 0:
                return 100.0
            return 0.0

        uplift_fcfs = calc_uplift(opt_recovered, fcfs_recovered)
        uplift_ha = calc_uplift(opt_recovered, ha_recovered)
        uplift_hp = calc_uplift(opt_recovered, hp_recovered)

        results_cache.uplift_pct = uplift_fcfs
        results_cache.by_cause = cause_breakdown

        results_cache.strategies = {
            "optimized": {
                "name": "PuLP MILP Optimizer",
                "recovered_paise": opt_recovered,
                "total_cost_paise": opt_costs + opt_fatigue_costs,
                "net_value_paise": opt_recovered - (opt_costs + opt_fatigue_costs),
                "uplift_pct_vs_fcfs": uplift_fcfs
            },
            "fcfs": {
                "name": "First-Come First-Served (FCFS)",
                "recovered_paise": fcfs_recovered,
                "total_cost_paise": fcfs_costs,
                "net_value_paise": fcfs_recovered - fcfs_costs,
                "uplift_pct_vs_fcfs": 0.0
            },
            "highest_amount": {
                "name": "Highest Amount First",
                "recovered_paise": ha_recovered,
                "total_cost_paise": ha_costs,
                "net_value_paise": ha_recovered - ha_costs,
                "uplift_pct": uplift_ha
            },
            "highest_probability": {
                "name": "Highest Probability First",
                "recovered_paise": hp_recovered,
                "total_cost_paise": hp_costs,
                "net_value_paise": hp_recovered - hp_costs,
                "uplift_pct": uplift_hp
            }
        }

        # Broadcast Stage 6: Completed
        await manager.broadcast({
            "type": "stage_update",
            "data": {"stage": "Updating Metrics", "progress": 100, "description": "Completed batch evaluation and multi-baseline comparison"}
        })

        await manager.broadcast({
            "type": "run_completed",
            "data": {
                "optimized_recovered_paise": opt_recovered,
                "baseline_recovered_paise": fcfs_recovered,
                "uplift_pct": results_cache.uplift_pct,
                "by_cause": cause_breakdown,
                "strategies": results_cache.strategies,
                "net_value_created_paise": results_cache.net_value_created_paise,
                "total_revenue_at_risk_paise": total_revenue_at_risk,
                "contacts_avoided_count": contacts_avoided
            }
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception(f"Unhandled error in process_batch_background: {e}")
    finally:
        results_cache.is_running = False

@router.post("/seed-batch", dependencies=[Depends(verify_demo_secret)])
async def seed_batch(limit: int = Query(210)):
    await asyncio.to_thread(store.clear_all)
    from seed.seed_data import generate_seed_payments
    payments = generate_seed_payments(count=limit)
    asyncio.create_task(process_batch_background(payments, 20))
    return {"status": "started", "cases_seeded": len(payments)}


@router.post("/recalibrate", dependencies=[Depends(verify_demo_secret)])
def recalibrate_model():
    """
    Part 7: Deterministic learning loop.
    Updates the Bayesian Beta-Binomial probability model parameters with the outcomes
    from the most recent batch run in a deterministic, reproducible manner.
    """
    if not results_cache.last_outcomes:
        # Fallback to loading outcomes from audit entries in store
        entries = store.get_audit_entries(limit=500)
        outcomes = []
        for e in entries:
            if e.triage_decision.allocated and e.guardrail_decision.outcome == "ALLOW":
                outcomes.append({
                    "cause": e.diagnosis.cause,
                    "action": e.triage_decision.candidate_action,
                    "recovered": 1 if (e.outcome and e.outcome.recovered) else 0
                })
        results_cache.last_outcomes = outcomes

    if not results_cache.last_outcomes:
        raise HTTPException(status_code=400, detail="No batch outcomes available for recalibration. Run a demo batch first.")

    target_pairs = [
        ("insufficient_balance", "send_whatsapp_nudge"),
        ("bank_timeout", "silent_retry"),
        ("card_declined", "suggest_alt_method"),
        ("wrong_otp", "send_whatsapp_nudge")
    ]

    prob_model = optimizer.prob_model
    before_stats = {}
    for cause, action in target_pairs:
        p_before, ci_l, ci_u = prob_model.estimate_probability_with_ci(cause, action, 0)
        obs_before = prob_model.total_observations.get((cause, action), 0)
        before_stats[(cause, action)] = {"p": p_before, "ci_lower": ci_l, "ci_upper": ci_u, "obs": obs_before}

    # Deterministic parameter update
    prob_model.update_with_records(results_cache.last_outcomes)

    after_stats = []
    for cause, action in target_pairs:
        p_after, ci_l, ci_u = prob_model.estimate_probability_with_ci(cause, action, 0)
        obs_after = prob_model.total_observations.get((cause, action), 0)
        b = before_stats[(cause, action)]
        after_stats.append({
            "cause": cause,
            "action": action,
            "before_p": b["p"],
            "after_p": p_after,
            "delta": round(p_after - b["p"], 4),
            "before_ci": [b["ci_lower"], b["ci_upper"]],
            "after_ci": [ci_l, ci_u],
            "new_observations": obs_after - b["obs"],
            "total_observations": obs_after
        })

    return {
        "status": "recalibrated",
        "badge_label": "Recalibrated from this batch's outcomes — deterministic, reproducible",
        "batch_sample_count": len(results_cache.last_outcomes),
        "pairs": after_stats
    }

import math

def compute_wilson_ci(k: int, n: int, confidence: float = 0.95) -> tuple[float, float]:
    """
    Computes the Wilson score interval for a binomial proportion.
    k: number of successes (recovered)
    n: total attempts
    confidence: 0.95 (z = 1.96)
    """
    if n <= 0:
        return 0.0, 0.0
    z = 1.96  # 95% confidence
    p_hat = k / n
    denominator = 1.0 + (z ** 2) / n
    centre_adjusted_probability = (p_hat + (z ** 2) / (2.0 * n)) / denominator
    margin = (z / denominator) * math.sqrt((p_hat * (1.0 - p_hat) / n) + ((z ** 2) / (4.0 * (n ** 2))))
    lower = max(0.0, centre_adjusted_probability - margin)
    upper = min(1.0, centre_adjusted_probability + margin)
    return round(lower, 4), round(upper, 4)

@router.post("/run-experiment", dependencies=[Depends(verify_demo_secret)])
def run_experiment(count: int = Query(120)):
    """
    Simulated Holdout Experimentation Engine.
    Draws directly from the already-seeded, already-diagnosed batch matching target causes
    (insufficient_balance, wrong_otp, card_declined) to ensure consistency with the active dashboard.
    Caps at min(count, available_matching_count) and returns transparent metadata.
    """
    # 1. Obtain pool from active batch or fallback
    payments = results_cache.last_payments
    diagnoses = results_cache.last_diagnoses

    if not payments or not diagnoses:
        # Fallback: if batch hasn't run yet or server restarted, seed a standard 210-payment batch
        from seed.seed_data import generate_seed_payments
        payments = generate_seed_payments(count=210)
        diagnoses = {p.id: diagnosis_engine.diagnose(p) for p in payments}
        results_cache.last_payments = payments
        results_cache.last_diagnoses = diagnoses

    # 2. Filter matching target causes: insufficient_balance, wrong_otp, card_declined
    target_causes = ["insufficient_balance", "wrong_otp", "card_declined"]
    matching_pairs = []
    for p in payments:
        diag = diagnoses.get(p.id) or diagnosis_engine.diagnose(p)
        if diag.cause in target_causes:
            matching_pairs.append((p, diag))

    # If matching pool is unexpectedly small, include other customer-actionable causes
    if len(matching_pairs) < 10:
        for p in payments:
            diag = diagnoses.get(p.id) or diagnosis_engine.diagnose(p)
            if diag.cause == "expired_mandate":
                matching_pairs.append((p, diag))

    # 3. Take up to requested count (min(count, available_matching_count))
    selected_count = min(count, len(matching_pairs)) if count > 0 else len(matching_pairs)
    selected_pairs = matching_pairs[:selected_count]

    group_a_pairs = []
    group_b_pairs = []

    # Deterministic alternating 50/50 split
    for i, pair in enumerate(selected_pairs):
        if i % 2 == 0:
            group_a_pairs.append(pair)
        else:
            group_b_pairs.append(pair)

    def evaluate_group(group_pairs: List[Any], action_name: str, group_label: str):
        attempts = len(group_pairs)
        recovered_count = 0
        recovered_paise = 0
        costs_paise = 0
        fatigue_paise = 0

        for p, diag in group_pairs:
            prior_cnt = 0
            
            c = get_action_cost(action_name, p.amount_paise)
            f = get_fatigue_cost(action_name, prior_cnt)
            costs_paise += c
            fatigue_paise += f

            rec, _ = simulate_recovery_outcome(p.id, action_name, diag.cause, p.amount_paise, prior_cnt)
            if rec:
                recovered_count += 1
                recovered_paise += p.amount_paise

        rate = round(recovered_count / attempts, 4) if attempts > 0 else 0.0
        net_val = recovered_paise - (costs_paise + fatigue_paise)
        ci_lower, ci_upper = compute_wilson_ci(recovered_count, attempts)
        ci_display = f"{rate * 100.0:.1f}% [{ci_lower * 100.0:.1f}%–{ci_upper * 100.0:.1f}%]"

        return {
            "group_label": group_label,
            "action": action_name,
            "attempts": attempts,
            "recovered_count": recovered_count,
            "recovery_rate": rate,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "ci_display": ci_display,
            "recovered_paise": recovered_paise,
            "costs_paise": costs_paise + fatigue_paise,
            "net_value_paise": net_val
        }

    group_a_results = evaluate_group(group_a_pairs, "send_whatsapp_nudge", "Group A (WhatsApp Nudge)")
    group_b_results = evaluate_group(group_b_pairs, "suggest_alt_method", "Group B (Alt Payment Method)")

    # Check for confidence interval overlap
    # Overlap occurs when max(lower_A, lower_B) <= min(upper_A, upper_B)
    ci_a = (group_a_results["ci_lower"], group_a_results["ci_upper"])
    ci_b = (group_b_results["ci_lower"], group_b_results["ci_upper"])
    intervals_overlap = max(ci_a[0], ci_b[0]) <= min(ci_a[1], ci_b[1])

    if intervals_overlap:
        winner = "Inconclusive at this sample size"
        is_inconclusive = True
    else:
        winner = "Group A" if group_a_results["net_value_paise"] >= group_b_results["net_value_paise"] else "Group B"
        is_inconclusive = False

    if len(selected_pairs) >= count:
        cohort_explanation = f"Evaluated on full requested N={len(selected_pairs)} ({len(matching_pairs)} available matching cases in active batch)"
    else:
        cohort_explanation = f"Requested N={count}, evaluated on N={len(selected_pairs)} available matching cases in active batch"

    return {
        "experiment_name": "Simulated Holdout Experiment",
        "sample_size": len(selected_pairs),
        "requested_n": count,
        "available_matching_count": len(matching_pairs),
        "cohort_explanation": cohort_explanation,
        "target_causes": target_causes,
        "split_method": "Deterministic 50/50 Holdout Split",
        "winner": winner,
        "is_inconclusive": is_inconclusive,
        "group_a": group_a_results,
        "group_b": group_b_results
    }

adversarial_counter = 0

@router.post("/trigger-adversarial-case", dependencies=[Depends(verify_demo_secret)])
async def trigger_adversarial_case(index: Optional[int] = Query(None)):
    global adversarial_counter
    from seed.seed_data import generate_seed_payments
    all_adv = [p for p in generate_seed_payments() if p.id.startswith("pay_adv_")]
    if not all_adv:
        raise HTTPException(status_code=500, detail="Adversarial cases failed to generate")
        
    if index is not None:
        case_idx = index % len(all_adv)
    else:
        case_idx = adversarial_counter % len(all_adv)
        adversarial_counter += 1

    p = all_adv[case_idx]
    diag = diagnosis_engine.diagnose(p)
    prior_contacts = {p.customer_id: store.get_recent_contacts_count(p.customer_id)}
    opt_dec = optimizer.allocate_batch([p], {p.id: diag}, prior_contacts)[0]
    policy_engine = PolicyEngine(store)
    guard_dec = policy_engine.evaluate(p, opt_dec)
    
    lifecycle: LifecycleState = "PRIORITIZED"
    if guard_dec.outcome == "BLOCK":
        lifecycle = "SUPPRESSED"
    elif guard_dec.outcome == "ESCALATE":
        lifecycle = "ESCALATED"

    audit_entry = AuditLogEntry(
        id=f"audit_{p.id}_{int(time.time() * 1000)}",
        failed_payment=p,
        diagnosis=diag,
        triage_decision=opt_dec,
        guardrail_decision=guard_dec,
        lifecycle_state=lifecycle,
        timestamp=datetime.now().isoformat()
    )
    store.add_audit_entry(audit_entry)
    
    from seed.seed_data import get_customer_name
    case_data = {
        "id": p.id,
        "customer_id": p.customer_id,
        "customer_name": get_customer_name(p.customer_id),
        "amount_paise": p.amount_paise,
        "method": p.method,
        "error_code": p.error_code,
        "error_reason": p.error_reason,
        "timestamp": p.timestamp,
        "cause": diag.cause,
        "diagnosis_confidence": diag.confidence,
        "diagnosis_source": diag.source,
        "evidence_json": json.dumps(diag.evidence),
        "candidate_action": opt_dec.candidate_action,
        "channel": opt_dec.channel,
        "expected_value": opt_dec.expected_value,
        "probability_estimate": opt_dec.probability_estimate,
        "cost": opt_dec.cost,
        "allocated": opt_dec.allocated,
        "triage_reason": opt_dec.reason,
        "outcome": guard_dec.outcome,
        "rule_fired": guard_dec.rule_fired,
        "guardrail_reason": guard_dec.reason,
        "lifecycle_state": lifecycle,
        "recovered": False,
        "amount_recovered_paise": 0,
        "conversation_json": "[]",
        "degraded": False
    }
    store.upsert_case(case_data)
    await manager.broadcast_audit_entry(case_data)
    return {"status": "processed", "case": case_data}

@router.post("/kill-switch", dependencies=[Depends(verify_demo_secret)])
async def toggle_kill_switch(payload: KillSwitchPayload):
    kill_switch.set_active(payload.active)
    await manager.broadcast_kill_switch(payload.active)
    return {"kill_switch_active": kill_switch.is_active()}

@router.post("/inject-failure", dependencies=[Depends(verify_demo_secret)])
def inject_failure(payload: FailureInjectionPayload):
    t = payload.failure_type
    if t not in ["llm_timeout", "razorpay_error", "none"]:
        raise HTTPException(status_code=400, detail="Invalid failure type")
        
    if t == "none":
        failure_flags["llm_timeout"] = False
        failure_flags["razorpay_error"] = False
    elif t == "llm_timeout":
        failure_flags["llm_timeout"] = True
    elif t == "razorpay_error":
        failure_flags["razorpay_error"] = True
        
    return {"llm_timeout": failure_flags["llm_timeout"], "razorpay_error": failure_flags["razorpay_error"]}
