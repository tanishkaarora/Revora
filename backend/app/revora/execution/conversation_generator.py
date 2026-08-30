from app.guardrail.types import FailureCause
from app.llm import get_llm_provider
from app.llm.fallback_keywords import fallback_generate_hinglish_message

class ConversationGenerator:
    def __init__(self):
        self.llm_provider = get_llm_provider()

    def generate_nudge(
        self, 
        customer_name: str, 
        amount_paise: int, 
        payment_link: str, 
        cause: FailureCause,
        use_llm: bool = False
    ) -> str:
        """
        Converts the amount to Rupees and generates a friendly Hinglish message.
        Uses fast deterministic templates for known failure causes, only invoking
        the LLM provider for genuinely ambiguous/fallback cases to prevent batch latency.
        """
        amount_rupees = amount_paise / 100.0
        if not use_llm:
            return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

        try:
            return self.llm_provider.generate_hinglish_message(
                customer_name=customer_name,
                amount_rupees=amount_rupees,
                payment_link=payment_link,
                cause=cause
            )
        except Exception:
            return fallback_generate_hinglish_message(customer_name, amount_rupees, payment_link, cause)

