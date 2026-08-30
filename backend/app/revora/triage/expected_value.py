# backend/app/revora/triage/expected_value.py

from app.guardrail.types import InterventionAction

# Fixed intervention costs in paise
ACTION_COSTS_PAISE = {
    "silent_retry": 0,
    "send_whatsapp_nudge": 500,     # ₹5
    "suggest_alt_method": 500,      # ₹5
    "escalate_human": 15000,        # ₹150
    "issue_refund": 0,              # Special case: cost is handled by amount itself
    "suppress": 0
}

# Base customer fatigue cost in paise (soft penalty for repeated outreach)
BASE_FATIGUE_COSTS_PAISE = {
    "send_whatsapp_nudge": 200,     # ₹2 base fatigue
    "suggest_alt_method": 200,      # ₹2 base fatigue
    "escalate_human": 1000,         # ₹10 base fatigue
    "silent_retry": 0,
    "issue_refund": 0,
    "suppress": 0
}


def get_action_cost(action: InterventionAction, amount_paise: int) -> float:
    """Returns the direct financial execution cost in paise."""
    if action == "issue_refund":
        return float(amount_paise)
    return float(ACTION_COSTS_PAISE.get(action, 0))


def get_fatigue_cost(action: InterventionAction, prior_contacts: int = 0) -> float:
    """
    Computes customer fatigue cost (in paise) scaling with prior contact count.
    - 0 prior contacts: 0 (fresh customer)
    - 1 prior contact: 1x base fatigue cost
    - 2 prior contacts: 2x base fatigue cost
    - 3 prior contacts: 4x base fatigue cost
    - k prior contacts: 2^(k-1) * base fatigue cost
    """
    if prior_contacts <= 0:
        return 0.0
    
    base_fatigue = float(BASE_FATIGUE_COSTS_PAISE.get(action, 0))
    if base_fatigue <= 0:
        return 0.0
    
    multiplier = 2 ** (prior_contacts - 1)
    return float(base_fatigue * multiplier)


def calculate_expected_value(
    probability: float, 
    amount_paise: int, 
    action: InterventionAction,
    prior_contacts: int = 0,
    risk_penalty: float = 0.0
) -> float:
    """
    Computes Expected Net Value (ENV):
    ENV = P(recovery) * amount_paise - intervention_cost - fatigue_cost - risk_penalty

    For refunds, ENV is modeled as negative amount waived, gated by policy engine.
    """
    if action == "suppress":
        return 0.0

    if action == "issue_refund":
        return -float(amount_paise)

    intervention_cost = get_action_cost(action, amount_paise)
    fatigue_cost = get_fatigue_cost(action, prior_contacts)

    expected_gross_recovery = probability * amount_paise
    expected_net_value = expected_gross_recovery - intervention_cost - fatigue_cost - risk_penalty

    return round(expected_net_value, 2)
