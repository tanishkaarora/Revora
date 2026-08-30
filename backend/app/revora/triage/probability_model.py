# backend/app/revora/triage/probability_model.py

"""
Data-driven Recovery Probability Model with Bayesian Beta-Binomial Calibration.

NOTE: This model is calibrated on synthetic, explicitly-labeled historical demo data
(from seed/historical_outcomes.py) to provide interpretable posterior estimates
with 95% confidence intervals. It falls back gracefully to a deterministic domain
scorecard if historical data is missing or corrupted.
"""

import math
import logging
from typing import Dict, Tuple, Optional, List, Any
from app.guardrail.types import FailureCause, InterventionAction

logger = logging.getLogger(__name__)

# Deterministic domain scorecard (acts as prior belief and robust fallback)
BASE_PROBABILITIES: Dict[str, Dict[str, float]] = {
    "insufficient_balance": {
        "silent_retry": 0.05,
        "send_whatsapp_nudge": 0.65,
        "suggest_alt_method": 0.70,
        "escalate_human": 0.85,
        "issue_refund": 0.0,
        "suppress": 0.0
    },
    "bank_timeout": {
        "silent_retry": 0.80,
        "send_whatsapp_nudge": 0.40,
        "suggest_alt_method": 0.40,
        "escalate_human": 0.50,
        "issue_refund": 0.0,
        "suppress": 0.0
    },
    "wrong_otp": {
        "silent_retry": 0.01,
        "send_whatsapp_nudge": 0.75,
        "suggest_alt_method": 0.70,
        "escalate_human": 0.85,
        "issue_refund": 0.0,
        "suppress": 0.0
    },
    "expired_mandate": {
        "silent_retry": 0.02,
        "send_whatsapp_nudge": 0.40,
        "suggest_alt_method": 0.60,
        "escalate_human": 0.75,
        "issue_refund": 0.0,
        "suppress": 0.0
    },
    "card_declined": {
        "silent_retry": 0.05,
        "send_whatsapp_nudge": 0.55,
        "suggest_alt_method": 0.75,
        "escalate_human": 0.80,
        "issue_refund": 0.0,
        "suppress": 0.0
    },
    "unknown": {
        "silent_retry": 0.10,
        "send_whatsapp_nudge": 0.40,
        "suggest_alt_method": 0.45,
        "escalate_human": 0.60,
        "issue_refund": 0.0,
        "suppress": 0.0
    }
}


class RecoveryProbabilityModel:
    """
    Bayesian Beta-Binomial probability estimator for recovery interventions.
    Maintains (alpha, beta) parameters for every (cause, action) pair.
    """
    def __init__(self, prior_weight: float = 25.0, load_historical: bool = True):
        self.prior_weight = prior_weight
        # Posterior parameters: (cause, action) -> (alpha, beta)
        self.params: Dict[Tuple[str, str], Tuple[float, float]] = {}
        self.total_observations: Dict[Tuple[str, str], int] = {}
        self._initialize_priors()
        
        if load_historical:
            self._fit_synthetic_history()

    def _initialize_priors(self):
        """Initializes Beta(alpha_0, beta_0) priors from domain scorecard."""
        for cause, actions in BASE_PROBABILITIES.items():
            for action, base_p in actions.items():
                alpha_0 = max(0.5, base_p * self.prior_weight)
                beta_0 = max(0.5, (1.0 - base_p) * self.prior_weight)
                self.params[(cause, action)] = (alpha_0, beta_0)
                self.total_observations[(cause, action)] = 0

    def _fit_synthetic_history(self):
        """Fits parameters from synthetic historical dataset."""
        try:
            from seed.historical_outcomes import generate_historical_outcomes
            records = generate_historical_outcomes(sample_size=1500)
            self.update_with_records(records)
            logger.info("Fitted RecoveryProbabilityModel on synthetic historical dataset.")
        except Exception as e:
            logger.warning(f"Could not load synthetic historical data: {e}. Relying on prior scorecard.")

    def update_with_records(self, records: List[Dict[str, Any]]):
        """
        Deterministically updates Beta-Binomial parameters with a batch of outcome records.
        Each record has: 'cause', 'action_type' (or 'action'), 'recovered' (0 or 1).
        """
        for r in records:
            cause = r.get("cause", "unknown")
            action = r.get("action_type") or r.get("action", "suppress")
            recovered = int(r.get("recovered", 0))

            key = (cause, action)
            if key not in self.params:
                # Default prior for unseen key
                self.params[key] = (1.0, 1.0)
                self.total_observations[key] = 0

            alpha, beta = self.params[key]
            if recovered == 1:
                self.params[key] = (alpha + 1.0, beta)
            else:
                self.params[key] = (alpha, beta + 1.0)
            self.total_observations[key] += 1

    def _fallback_estimate(self, cause: str, action: str, prior_contact_count: int) -> float:
        """Deterministic static scorecard fallback."""
        cause_matrix = BASE_PROBABILITIES.get(cause, BASE_PROBABILITIES["unknown"])
        base_p = cause_matrix.get(action, 0.0)
        if action in ["send_whatsapp_nudge", "suggest_alt_method", "escalate_human"] and prior_contact_count > 0:
            decay_factor = 0.5 ** prior_contact_count
            return round(base_p * decay_factor, 4)
        return round(base_p, 4)

    def estimate_probability_with_ci(
        self, 
        cause: FailureCause, 
        action: InterventionAction, 
        prior_contact_count: int = 0
    ) -> Tuple[float, float, float]:
        """
        Returns (point_estimate, ci_lower, ci_upper) for P(recovery | cause, action, prior_contacts).
        Confidence interval uses Beta posterior variance with normal approximation bounded in [0, 1].
        """
        if action == "suppress" or action == "issue_refund":
            return (0.0, 0.0, 0.0)

        key = (str(cause), str(action))
        if key not in self.params:
            p = self._fallback_estimate(cause, action, prior_contact_count)
            return (p, max(0.0, p - 0.1), min(1.0, p + 0.1))

        alpha, beta = self.params[key]
        total = alpha + beta
        base_p = alpha / total

        # Contact fatigue attenuation: monotonic non-increasing with prior contacts
        # For non-contact actions like silent_retry, prior contacts have minimal penalty
        if action == "silent_retry":
            fatigue_decay = 1.0
        else:
            fatigue_decay = 1.0 / (1.0 + (0.35 * prior_contact_count))
            
        p_est = max(0.005, min(0.99, base_p * fatigue_decay))

        # Posterior variance of Beta distribution
        variance = (alpha * beta) / ((total ** 2) * (total + 1))
        std_err = math.sqrt(variance) * fatigue_decay
        
        z = 1.96  # 95% CI
        ci_lower = max(0.0, round(p_est - (z * std_err), 4))
        ci_upper = min(1.0, round(p_est + (z * std_err), 4))

        return (round(p_est, 4), ci_lower, ci_upper)


    def estimate_probability(
        self, 
        cause: FailureCause, 
        action: InterventionAction, 
        prior_contact_count: int = 0
    ) -> float:
        """
        Estimates recovery probability point estimate.
        """
        p_est, _, _ = self.estimate_probability_with_ci(cause, action, prior_contact_count)
        return p_est
