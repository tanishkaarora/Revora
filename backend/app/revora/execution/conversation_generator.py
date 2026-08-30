# backend/app/revora/execution/conversation_generator.py

from app.guardrail.types import FailureCause
from app.llm import get_llm_provider

class ConversationGenerator:
    def __init__(self):
        self.llm_provider = get_llm_provider()

    def generate_nudge(self, customer_name: str, amount_paise: int, payment_link: str, cause: FailureCause) -> str:
        """
        Converts the amount to Rupees and generates a Hinglish message.
        """
        amount_rupees = amount_paise / 100.0
        try:
            return self.llm_provider.generate_hinglish_message(
                customer_name=customer_name,
                amount_rupees=amount_rupees,
                payment_link=payment_link,
                cause=cause
            )
        except Exception as e:
            # High-reliability fallback formatting
            return (
                f"Hi {customer_name}! Aapka ₹{amount_rupees:.2f} ka payment process nahi ho paya due to {cause.replace('_', ' ')}. "
                f"Use this safe link to complete your payment: {payment_link}. Thank you!"
            )
