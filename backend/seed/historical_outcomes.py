# backend/seed/historical_outcomes.py
"""
Synthetic Historical Payment Recovery Outcomes Dataset.
NOTE: This dataset contains synthetic, explicitly-labeled demo data designed
to demonstrate Bayesian Beta-Binomial recovery probability calibration and historical
evidence aggregation. It is NOT real production customer data.
"""

import random
from typing import List, Dict, Any, Tuple

# Baseline ground-truth historical success generators
HISTORICAL_GROUND_TRUTH = {
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

ACTIONS = ["silent_retry", "send_whatsapp_nudge", "suggest_alt_method", "escalate_human", "suppress"]
CAUSES = ["bank_timeout", "insufficient_balance", "wrong_otp", "card_declined", "expired_mandate", "unknown"]
PAYMENT_METHODS = ["upi", "card", "netbanking", "mandate"]


def generate_historical_outcomes(sample_size: int = 1500, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates a realistic synthetic historical dataset of payment recovery attempts and outcomes.
    """
    rng = random.Random(seed)
    records = []

    for i in range(sample_size):
        cause = rng.choices(
            CAUSES, 
            weights=[0.30, 0.30, 0.15, 0.12, 0.08, 0.05]
        )[0]
        
        method = rng.choice(PAYMENT_METHODS)
        amount_paise = rng.choice([49900, 99900, 149900, 249900, 499900, 999900, 1500000])
        prior_contacts = rng.choices([0, 1, 2, 3], weights=[0.60, 0.25, 0.10, 0.05])[0]
        
        # Plausible action assigned historically
        if cause == "bank_timeout":
            action = rng.choices(ACTIONS[:-1], weights=[0.65, 0.15, 0.10, 0.10])[0]
        elif cause == "insufficient_balance":
            action = rng.choices(ACTIONS[:-1], weights=[0.05, 0.45, 0.35, 0.15])[0]
        elif cause == "wrong_otp":
            action = rng.choices(ACTIONS[:-1], weights=[0.02, 0.55, 0.30, 0.13])[0]
        elif cause == "card_declined":
            action = rng.choices(ACTIONS[:-1], weights=[0.05, 0.30, 0.50, 0.15])[0]
        elif cause == "expired_mandate":
            action = rng.choices(ACTIONS[:-1], weights=[0.02, 0.35, 0.45, 0.18])[0]
        else:
            action = rng.choice(ACTIONS[:-1])

        time_since_failure_mins = rng.randint(5, 720)
        day_of_week = rng.choice(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
        hour_of_day = rng.randint(8, 21)

        # Ground truth recovery probability calculation
        base_rate = HISTORICAL_GROUND_TRUTH.get((cause, action), 0.10)
        fatigue_decay = max(0.20, 1.0 - (0.18 * prior_contacts))
        time_factor = 1.0 if time_since_failure_mins < 180 else 0.92
        noise = rng.uniform(-0.03, 0.03)
        effective_prob = max(0.01, min(0.99, (base_rate * fatigue_decay * time_factor) + noise))
        
        recovered = 1 if rng.random() < effective_prob else 0

        records.append({
            "history_id": f"hist_{i:05d}",
            "cause": cause,
            "payment_method": method,
            "amount_paise": amount_paise,
            "prior_contact_count": prior_contacts,
            "action_type": action,
            "time_since_failure_mins": time_since_failure_mins,
            "day_of_week": day_of_week,
            "hour_of_day": hour_of_day,
            "recovered": recovered
        })

    return records


def get_historical_evidence_aggregates(seed: int = 42) -> List[Dict[str, Any]]:
    """
    Computes per-(cause, action) historical aggregate evidence statistics.
    Returns: list of dicts with cause, action, attempts, recovered, recovery_rate, ci_lower, ci_upper.
    """
    data = generate_historical_outcomes(sample_size=1500, seed=seed)
    stats: Dict[Tuple[str, str], Dict[str, int]] = {}

    for row in data:
        key = (row["cause"], row["action_type"])
        if key not in stats:
            stats[key] = {"attempts": 0, "recovered": 0}
        stats[key]["attempts"] += 1
        stats[key]["recovered"] += row["recovered"]

    results = []
    for (cause, action), counts in sorted(stats.items()):
        attempts = counts["attempts"]
        recovered = counts["recovered"]
        rate = round(recovered / attempts, 4) if attempts > 0 else 0.0
        
        # 95% Wilson Score Interval for Binomial proportion
        z = 1.96
        if attempts > 0:
            denom = 1 + (z**2 / attempts)
            center = (rate + (z**2 / (2 * attempts))) / denom
            margin = (z * ((rate * (1 - rate) / attempts) + (z**2 / (4 * attempts**2))) ** 0.5) / denom
            ci_lower = round(max(0.0, center - margin), 4)
            ci_upper = round(min(1.0, center + margin), 4)
        else:
            ci_lower = 0.0
            ci_upper = 0.0

        results.append({
            "cause": cause,
            "action": action,
            "attempts": attempts,
            "recovered": recovered,
            "recovery_rate": rate,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper
        })

    return results
