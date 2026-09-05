# backend/app/audit/store.py
import os
import sqlite3
import json
from typing import List, Optional, Dict, Any
from app.guardrail.types import AuditLogEntry, FailedPayment, Diagnosis, TriageDecision, GuardrailDecision, RecoveryOutcome
from app.audit.models import (
    CREATE_AUDIT_LOG_TABLE,
    CREATE_INDEX_AUDIT_CUSTOMER,
    CREATE_INDEX_AUDIT_PAYMENT,
    CREATE_PROMISES_TABLE,
    CREATE_INDEX_PROMISES_CUSTOMER,
    CREATE_CASES_TABLE,
    CREATE_INDEX_CASES_CUSTOMER
)

class AuditStore:
    def __init__(self, db_path: str = "./data/recovery.db"):
        self.db_path = os.getenv("DATABASE_PATH", db_path)
        # Ensure directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=20.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.execute(CREATE_AUDIT_LOG_TABLE)
            cursor.execute(CREATE_INDEX_AUDIT_CUSTOMER)
            cursor.execute(CREATE_INDEX_AUDIT_PAYMENT)
            cursor.execute(CREATE_PROMISES_TABLE)
            cursor.execute(CREATE_INDEX_PROMISES_CUSTOMER)
            cursor.execute(CREATE_CASES_TABLE)
            cursor.execute(CREATE_INDEX_CASES_CUSTOMER)
            try:
                cursor.execute("ALTER TABLE cases ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'FAILED'")
            except Exception:
                pass
            conn.commit()

    # --- Append-Only Audit Log Operations ---
    # WARNING: Strictly append-only. There are no UPDATE or DELETE queries for this table.
    def add_audit_entry(self, entry: AuditLogEntry):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO audit_log (id, failed_payment_id, customer_id, timestamp, entry_json) VALUES (?, ?, ?, ?, ?)",
                (
                    entry.id,
                    entry.failed_payment.id,
                    entry.failed_payment.customer_id,
                    entry.timestamp,
                    entry.model_dump_json()
                )
            )
            conn.commit()

    def get_audit_entries(self, limit: int = 100, offset: int = 0) -> List[AuditLogEntry]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT entry_json FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
            rows = cursor.fetchall()
            entries = []
            for row in rows:
                entries.append(AuditLogEntry.model_validate_json(row["entry_json"]))
            return entries

    def get_recent_contacts_count(self, customer_id: str) -> int:
        """
        Fast lookup to count number of contact interventions allowed for a customer.
        Looks up the audit logs. Since customer_id is indexed, this is very fast.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT entry_json FROM audit_log WHERE customer_id = ?",
                (customer_id,)
            )
            rows = cursor.fetchall()
            count = 0
            for row in rows:
                entry = AuditLogEntry.model_validate_json(row["entry_json"])
                # Count if the action was a contact action, was allocated capacity, and was allowed by guardrail
                if (
                    entry.triage_decision.allocated and 
                    entry.guardrail_decision.outcome == "ALLOW" and
                    entry.triage_decision.candidate_action in ["send_whatsapp_nudge", "escalate_human"]
                ):
                    count += 1
                elif (
                    entry.triage_decision.allocated and
                    entry.guardrail_decision.outcome == "ALLOW" and
                    entry.triage_decision.candidate_action in ["suggest_alt_method"]
                ):
                    count += 1
            return count

    # --- Promise Tracking Operations ---
    def create_or_update_promise(self, failed_payment_id: str, customer_id: str, promised_date: Optional[str], confidence: float, status: str, raw_reply: str, timestamp: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO promises (failed_payment_id, customer_id, promised_date, confidence, status, raw_reply, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (failed_payment_id, customer_id, promised_date, confidence, status, raw_reply, timestamp)
            )
            conn.commit()

    def get_active_promise(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves any pending promise for this customer.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM promises WHERE customer_id = ? AND status = 'pending' LIMIT 1",
                (customer_id,)
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def is_customer_opted_out(self, customer_id: str) -> bool:
        """
        Checks if the customer has explicitly opted out / refused contact.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM promises WHERE customer_id = ? AND status IN ('opted_out', 'refused') LIMIT 1",
                (customer_id,)
            )
            return cursor.fetchone() is not None

    def get_all_promises(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM promises")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # --- Case Read Model Operations (For Web Dashboard) ---
    def upsert_case(self, case_data: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO cases (
                    id, customer_id, amount_paise, method, error_code, error_reason, timestamp,
                    cause, diagnosis_confidence, diagnosis_source, evidence_json,
                    candidate_action, channel, expected_value, probability_estimate, cost, allocated, triage_reason,
                    outcome, rule_fired, guardrail_reason, lifecycle_state,
                    recovered, amount_recovered_paise, conversation_json, degraded, degradation_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_data["id"],
                    case_data["customer_id"],
                    case_data["amount_paise"],
                    case_data["method"],
                    case_data["error_code"],
                    case_data["error_reason"],
                    case_data["timestamp"],
                    case_data["cause"],
                    case_data["diagnosis_confidence"],
                    case_data["diagnosis_source"],
                    case_data.get("evidence_json", "{}"),
                    case_data["candidate_action"],
                    case_data["channel"],
                    case_data["expected_value"],
                    case_data["probability_estimate"],
                    case_data["cost"],
                    1 if case_data.get("allocated", False) else 0,
                    case_data["triage_reason"],
                    case_data["outcome"],
                    case_data["rule_fired"],
                    case_data["guardrail_reason"],
                    case_data.get("lifecycle_state", "FAILED"),
                    1 if case_data.get("recovered", False) else 0,
                    case_data.get("amount_recovered_paise", 0),
                    case_data.get("conversation_json", "[]"),
                    1 if case_data.get("degraded", False) else 0,
                    case_data.get("degradation_reason")
                )
            )
            conn.commit()

    def upsert_cases_batch(self, cases_list: List[Dict[str, Any]]):
        if not cases_list:
            return
        with self.get_connection() as conn:
            cursor = conn.cursor()
            params = [
                (
                    c["id"],
                    c["customer_id"],
                    c["amount_paise"],
                    c["method"],
                    c["error_code"],
                    c["error_reason"],
                    c["timestamp"],
                    c["cause"],
                    c["diagnosis_confidence"],
                    c["diagnosis_source"],
                    c.get("evidence_json", "{}"),
                    c["candidate_action"],
                    c["channel"],
                    c["expected_value"],
                    c["probability_estimate"],
                    c["cost"],
                    1 if c.get("allocated", False) else 0,
                    c["triage_reason"],
                    c["outcome"],
                    c["rule_fired"],
                    c["guardrail_reason"],
                    c.get("lifecycle_state", "FAILED"),
                    1 if c.get("recovered", False) else 0,
                    c.get("amount_recovered_paise", 0),
                    c.get("conversation_json", "[]"),
                    1 if c.get("degraded", False) else 0,
                    c.get("degradation_reason")
                )
                for c in cases_list
            ]
            cursor.executemany(
                """
                INSERT OR REPLACE INTO cases (
                    id, customer_id, amount_paise, method, error_code, error_reason, timestamp,
                    cause, diagnosis_confidence, diagnosis_source, evidence_json,
                    candidate_action, channel, expected_value, probability_estimate, cost, allocated, triage_reason,
                    outcome, rule_fired, guardrail_reason, lifecycle_state,
                    recovered, amount_recovered_paise, conversation_json, degraded, degradation_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                params
            )
            conn.commit()


    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d["evidence"] = json.loads(d["evidence_json"]) if d["evidence_json"] else {}
                d["conversation"] = json.loads(d["conversation_json"]) if d["conversation_json"] else []
                d["allocated"] = bool(d["allocated"])
                d["recovered"] = bool(d["recovered"])
                d["degraded"] = bool(d["degraded"])
                try:
                    from seed.seed_data import get_customer_name
                    d["customer_name"] = get_customer_name(d["customer_id"])
                except Exception:
                    d["customer_name"] = "Customer"
                return d
            return None

    def list_cases(self, outcome: Optional[str] = None, cause: Optional[str] = None, channel: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM cases WHERE 1=1"
        params = []
        if outcome:
            query += " AND outcome = ?"
            params.append(outcome)
        if cause:
            query += " AND cause = ?"
            params.append(cause)
        if channel:
            query += " AND channel = ?"
            params.append(channel)
        
        query += " ORDER BY timestamp DESC"
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for row in rows:
                d = dict(row)
                d["evidence"] = json.loads(d["evidence_json"]) if d["evidence_json"] else {}
                d["conversation"] = json.loads(d["conversation_json"]) if d["conversation_json"] else []
                d["allocated"] = bool(d["allocated"])
                d["recovered"] = bool(d["recovered"])
                d["degraded"] = bool(d["degraded"])
                try:
                    from seed.seed_data import get_customer_name
                    d["customer_name"] = get_customer_name(d["customer_id"])
                except Exception:
                    d["customer_name"] = "Customer"
                results.append(d)
            return results

    def clear_all(self):
        """
        Clears tables for seed data reset safely without schema table dropping.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM audit_log")
            cursor.execute("DELETE FROM promises")
            cursor.execute("DELETE FROM cases")
            conn.commit()
