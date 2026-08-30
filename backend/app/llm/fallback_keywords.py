# backend/app/llm/fallback_keywords.py
from datetime import datetime, timedelta
from typing import Tuple, Optional
from app.guardrail.types import FailureCause

# Negations that indicate clear non-commitment
FALLBACK_NEGATIONS = [
    "not pay", "not retry", "never", "stop", "cancel", "no ", "not paying", 
    "don't", "dont", "no,", "nahi karunga", "nahi hoga", "nahi karna", "mat karo", "fraud"
]

# Hinglish Affirmatives, Actions, and Temporal signals indicating commitment
FALLBACK_COMMIT_WORDS = [
    "haan", "haa", "ha", "theek hai", "thik hai", "theek", "thik", 
    "ok", "okay", "yes", "sure", "pakka", "done", "kar dunga", "kar denge", 
    "karta hu", "karti hu", "karenge", "bhej dunga", "pay", "retry", "doing",
    "kal", "tomorrow", "parso", "shyam", "evening", "morning", "afternoon", "dopahar",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "somwar", "mangalwar", "budhwar", "guruwar", "shukrawar", "shaniwar", "ravivar",
    "date", "thodi der", "later", "baad", "agale", "next"
]

# Weekday index map (0 = Monday, ..., 6 = Sunday)
WEEKDAY_MAP = {
    "monday": 0, "somwar": 0,
    "tuesday": 1, "mangalwar": 1,
    "wednesday": 2, "budhwar": 2,
    "thursday": 3, "guruwar": 3,
    "friday": 4, "shukrawar": 4,
    "saturday": 5, "shaniwar": 5,
    "sunday": 6, "ravivar": 6
}

def fallback_extract_commitment(reply: str) -> Tuple[bool, Optional[str], float]:
    """
    Deterministic rule-based fallback to extract commitment and target date
    when LLM APIs (Ollama, Gemini, Groq) are offline, timing out, or unavailable.
    """
    reply_lower = reply.lower()
    today = datetime.now()

    # 1. Check for explicit negations first
    if any(neg in reply_lower for neg in FALLBACK_NEGATIONS):
        return False, None, 0.9

    # 2. Check for affirmative commitment signals
    has_commit = any(w in reply_lower for w in FALLBACK_COMMIT_WORDS) or ("yes" in reply_lower and "not" not in reply_lower)
    promised_date = None
    confidence = 0.5

    if has_commit:
        confidence = 0.7
        if "tomorrow" in reply_lower or "kal" in reply_lower:
            promised_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
            confidence = 0.85
        elif "parso" in reply_lower:
            promised_date = (today + timedelta(days=2)).strftime("%Y-%m-%d")
            confidence = 0.85
        elif any(day in reply_lower for day in WEEKDAY_MAP):
            for day, target_idx in WEEKDAY_MAP.items():
                if day in reply_lower:
                    current_idx = today.weekday()
                    days_ahead = (target_idx - current_idx) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    promised_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
                    confidence = 0.8
                    break
        elif "later" in reply_lower or "thodi der" in reply_lower or "baad" in reply_lower or "shyam" in reply_lower:
            promised_date = today.strftime("%Y-%m-%d")
            confidence = 0.75

    return has_commit, promised_date, confidence

def fallback_classify_failure_cause(error_code: str, error_reason: str) -> Tuple[FailureCause, float]:
    """
    Deterministic scorecard fallback for payment error classification.
    """
    reason_lower = error_reason.lower() if error_reason else ""
    code_lower = error_code.lower() if error_code else ""
    
    if "balance" in reason_lower or "insufficient" in reason_lower or "funds" in reason_lower or "balance" in code_lower:
        return "insufficient_balance", 0.7
    elif "timeout" in reason_lower or "gateway" in reason_lower or "response" in reason_lower or "timed out" in reason_lower or "timeout" in code_lower:
        return "bank_timeout", 0.7
    elif "otp" in reason_lower or "validation" in reason_lower or "incorrect pin" in reason_lower or "otp" in code_lower:
        return "wrong_otp", 0.7
    elif "mandate" in reason_lower or "expired" in reason_lower or "cancelled" in reason_lower or "mandate" in code_lower:
        return "expired_mandate", 0.7
    elif "decline" in reason_lower or "card" in reason_lower or "cvv" in reason_lower or "decline" in code_lower:
        return "card_declined", 0.7
    return "unknown", 0.5

def fallback_generate_hinglish_message(customer_name: str, amount_rupees: float, payment_link: str, cause: FailureCause) -> str:
    """
    Deterministic fallback for Hinglish WhatsApp message generation.
    """
    if cause == "insufficient_balance":
        return f"Hi {customer_name}! Aapka ₹{amount_rupees:.2f} ka payment check fail ho gaya balance issue ki wajah se. Koi baat nahi, aap is link pe click karke kisi aur account ya UPI se retry kar sakte hain: {payment_link}. Thank you!"
    elif cause == "bank_timeout":
        return f"Hi {customer_name}, server error ya network slow hone ki wajah se aapka ₹{amount_rupees:.2f} ka payment drop ho gaya tha. Paise cut gaye ho toh automatically refund ho jayenge. Aap is link se safe retry kar sakte hain: {payment_link}."
    elif cause == "wrong_otp":
        return f"Hello {customer_name}, ₹{amount_rupees:.2f} transaction ke liye enter kiya gaya OTP invalid tha. Aap is link par click karke fresh OTP request karke complete kar sakte hain: {payment_link}."
    else:
        return f"Hi {customer_name}! Aapka ₹{amount_rupees:.2f} ka payment verify nahi ho paya. Please check karke retry karein: {payment_link}."
