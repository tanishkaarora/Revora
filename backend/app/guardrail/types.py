from typing import Literal, Optional, Dict, Any
from pydantic import BaseModel

FailureCause = Literal[
    "bank_timeout", "insufficient_balance", "expired_mandate",
    "wrong_otp", "card_declined", "unknown",
]

InterventionAction = Literal[
    "silent_retry", "suggest_alt_method", "send_whatsapp_nudge",
    "escalate_human", "issue_refund", "suppress",
]

DecisionOutcome = Literal["ALLOW", "BLOCK", "ESCALATE"]

LifecycleState = Literal[
    "FAILED", "DIAGNOSED", "PRIORITIZED", "CONTACTED",
    "PROMISED", "WAITING", "RECOVERED", "RETRY", "ESCALATED", "SUPPRESSED"
]

class FailedPayment(BaseModel):
    id: str
    customer_id: str
    amount_paise: int
    method: str                  # upi | card | netbanking | autopay
    error_code: str
    error_reason: str
    timestamp: str

class Diagnosis(BaseModel):
    failed_payment_id: str
    cause: FailureCause
    confidence: float            # 1.0 if rule-matched, <1.0 if LLM fallback
    source: Literal["rule", "llm_fallback"]
    evidence: Dict[str, Any]

class TriageDecision(BaseModel):
    failed_payment_id: str
    candidate_action: InterventionAction
    channel: str
    expected_value: float        # in paise
    probability_estimate: float
    cost: float                  # in paise
    allocated: bool              # did it win a capacity slot?
    reason: str                  # e.g. "ranked #4 of 40 for whatsapp channel, capacity=50"

class GuardrailDecision(BaseModel):
    failed_payment_id: str
    outcome: DecisionOutcome
    rule_fired: str              # never blank, e.g. "none", "contact_cap_exceeded", "quiet_hours", "kill_switch_active", "promise_pending", "refund_signature_required"
    reason: str
    timestamp: str

class Commitment(BaseModel):
    failed_payment_id: str
    commits: bool
    refuses: bool = False
    requests_link: bool = False
    outcome: Literal["commits", "refuses", "requests_link", "ambiguous"] = "ambiguous"
    promised_date: Optional[str] = None
    confidence: float
    raw_reply: str
    reason: Optional[str] = None

class RecoveryOutcome(BaseModel):
    failed_payment_id: str
    recovered: bool
    amount_recovered_paise: int
    cause: FailureCause          # denormalized for easy batch aggregation

class AuditLogEntry(BaseModel):
    id: str
    failed_payment: FailedPayment
    diagnosis: Diagnosis
    triage_decision: TriageDecision
    guardrail_decision: GuardrailDecision
    outcome: Optional[RecoveryOutcome] = None
    lifecycle_state: Optional[str] = "FAILED"
    degraded: bool = False
    degradation_reason: Optional[str] = None
    timestamp: str
