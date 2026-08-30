# backend/app/revora/diagnosis/error_code_map.py

from typing import Dict, Optional
from app.guardrail.types import FailureCause

# Maps Razorpay Error Code / Reason Code strings to FailureCause literal
ERROR_CODE_MAP: Dict[str, FailureCause] = {
    # Insufficient Balance
    "BAD_REQUEST_PAYMENT_ACCOUNT_INSUFFICIENT_FUNDS": "insufficient_balance",
    "BAD_REQUEST_PAYMENT_UPI_INSUFFICIENT_FUNDS": "insufficient_balance",
    "insufficient_funds": "insufficient_balance",
    "insufficient_balance": "insufficient_balance",
    "netbanking_insufficient_funds": "insufficient_balance",
    
    # Bank Timeout / Gateway
    "GATEWAY_ERROR": "bank_timeout",
    "SERVER_ERROR": "bank_timeout",
    "gateway_timeout": "bank_timeout",
    "bank_timeout": "bank_timeout",
    "network_failure": "bank_timeout",
    "internal_server_error": "bank_timeout",
    "gateway_error": "bank_timeout",
    "payment_gateway_error": "bank_timeout",
    
    # Wrong OTP / PIN
    "BAD_REQUEST_PAYMENT_PIN_INCORRECT": "wrong_otp",
    "BAD_REQUEST_PAYMENT_OTP_INCORRECT": "wrong_otp",
    "PAYMENT_DECLINED_ON_OTP_PAGE": "wrong_otp",
    "wrong_otp": "wrong_otp",
    "incorrect_pin": "wrong_otp",
    "incorrect_otp": "wrong_otp",
    "otp_expired": "wrong_otp",
    
    # Card Declined
    "BAD_REQUEST_PAYMENT_CARD_EXPIRED": "card_declined",
    "BAD_REQUEST_PAYMENT_CARD_EXCLUSION": "card_declined",
    "BAD_REQUEST_PAYMENT_CARD_HOLDER_NAME_INVALID": "card_declined",
    "card_declined": "card_declined",
    "payment_declined": "card_declined",
    "card_expired": "card_declined",
    "invalid_cvv": "card_declined",
    "invalid_card_details": "card_declined",
    
    # Expired Mandate / Autopay fail
    "BAD_REQUEST_PAYMENT_MANDATE_EXPIRED": "expired_mandate",
    "BAD_REQUEST_PAYMENT_MANDATE_CANCELLED": "expired_mandate",
    "expired_mandate": "expired_mandate",
    "mandate_failed": "expired_mandate",
    "autopay_failed": "expired_mandate",
    "mandate_expired": "expired_mandate",
    "subscription_expired": "expired_mandate"
}

def lookup_error_cause(error_code: str, error_reason: str) -> Optional[FailureCause]:
    """
    Checks if error_code or error_reason matches any known patterns deterministically.
    """
    code_match = ERROR_CODE_MAP.get(error_code)
    if code_match:
        return code_match
        
    reason_match = ERROR_CODE_MAP.get(error_reason)
    if reason_match:
        return reason_match
        
    # Pattern matching checks
    code_lower = error_code.lower() if error_code else ""
    reason_lower = error_reason.lower() if error_reason else ""
    
    if "balance" in reason_lower or "funds" in reason_lower:
        return "insufficient_balance"
    if "timeout" in reason_lower or "gateway" in reason_lower or "timed out" in reason_lower or "network" in reason_lower:
        return "bank_timeout"
    if "otp" in reason_lower or "pin" in reason_lower or "verification" in reason_lower:
        return "wrong_otp"
    if "mandate" in reason_lower or "expired" in reason_lower or "cancel" in reason_lower:
        return "expired_mandate"
    if "card" in reason_lower or "decline" in reason_lower or "cvv" in reason_lower:
        return "card_declined"
        
    return None
