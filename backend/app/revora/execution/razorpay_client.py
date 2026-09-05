# backend/app/revora/execution/razorpay_client.py

import os
import requests
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

class RazorpayClient:
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "rzp_test_dummykeyid")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "dummypaysecret")
        self.base_url = "https://api.razorpay.com/v1"
        self.auth = (self.key_id, self.key_secret)

    def create_payment_link(self, amount_paise: int, description: str, customer_name: str, customer_email: str = "customer@example.com", customer_contact: str = "+919999999999", mock_mode: bool = True) -> Tuple[str, bool, str]:
        """
        Creates a Razorpay Payment Link.
        In demo simulation or when mock_mode is True, returns a mock payment link instantly.
        """
        if mock_mode or "dummy" in self.key_id.lower() or not self.key_id:
            mock_url = f"https://rzp.io/i/mock_link_{amount_paise}"
            return mock_url, False, "Success"

        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": customer_name,
                "email": customer_email,
                "contact": customer_contact
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "notes": {
                "system": "Revora Recovery Engine"
            }
        }

        try:
            response = requests.post(
                f"{self.base_url}/payment_links",
                json=payload,
                auth=self.auth,
                timeout=5.0
            )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                return data.get("short_url", ""), False, "Success"
            else:
                err_msg = f"Razorpay API Error {response.status_code}: {response.text}"
                logger.error(err_msg)
                # Fallback to local mock on API error
                mock_url = f"https://rzp.io/i/mock_link_{amount_paise}"
                return mock_url, True, err_msg
        except Exception as e:
            err_msg = f"Razorpay connection failed: {e}"
            logger.error(err_msg)
            mock_url = f"https://rzp.io/i/mock_link_{amount_paise}"
            return mock_url, True, err_msg

    def issue_refund(self, payment_id: str, amount_paise: int, mock_mode: bool = True) -> Tuple[str, bool, str]:
        """
        Issues a refund for a payment in test mode.
        """
        if mock_mode or "dummy" in self.key_id.lower() or not self.key_id or payment_id.startswith("pay_mock_") or payment_id.startswith("pay_"):
            mock_refund_id = f"rfnd_mock_{payment_id}"
            return mock_refund_id, False, "Success"

        payload = {
            "amount": amount_paise,
            "speed": "normal",
            "notes": {
                "reason": "Revora Policy Refund"
            }
        }


        try:
            response = requests.post(
                f"{self.base_url}/payments/{payment_id}/refund",
                json=payload,
                auth=self.auth,
                timeout=5.0
            )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                return data.get("id", f"rfnd_mock_{payment_id}"), False, "Success"
            else:
                err_msg = f"Razorpay Refund API Error {response.status_code}: {response.text}"
                logger.error(err_msg)
                return f"rfnd_mock_{payment_id}", True, err_msg
        except Exception as e:
            err_msg = f"Razorpay connection failed: {e}"
            logger.error(err_msg)
            return f"rfnd_mock_{payment_id}", True, err_msg
