# backend/app/audit/models.py

CREATE_AUDIT_LOG_TABLE = """
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    failed_payment_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    entry_json TEXT NOT NULL
);
"""

CREATE_INDEX_AUDIT_CUSTOMER = """
CREATE INDEX IF NOT EXISTS idx_audit_customer ON audit_log (customer_id);
"""

CREATE_INDEX_AUDIT_PAYMENT = """
CREATE INDEX IF NOT EXISTS idx_audit_payment ON audit_log (failed_payment_id);
"""

CREATE_PROMISES_TABLE = """
CREATE TABLE IF NOT EXISTS promises (
    failed_payment_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    promised_date TEXT,
    confidence REAL NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'kept', 'broken'
    raw_reply TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

CREATE_INDEX_PROMISES_CUSTOMER = """
CREATE INDEX IF NOT EXISTS idx_promises_customer ON promises (customer_id);
"""

CREATE_CASES_TABLE = """
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    method TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_reason TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    
    -- Diagnosis
    cause TEXT NOT NULL,
    diagnosis_confidence REAL NOT NULL,
    diagnosis_source TEXT NOT NULL,
    evidence_json TEXT,
    
    -- Triage
    candidate_action TEXT NOT NULL,
    channel TEXT NOT NULL,
    expected_value REAL NOT NULL,
    probability_estimate REAL NOT NULL,
    cost REAL NOT NULL,
    allocated INTEGER NOT NULL, -- 0 or 1
    triage_reason TEXT NOT NULL,
    
    -- Guardrail
    outcome TEXT NOT NULL, -- 'ALLOW', 'BLOCK', 'ESCALATE'
    rule_fired TEXT NOT NULL,
    guardrail_reason TEXT NOT NULL,
    
    -- Lifecycle State
    lifecycle_state TEXT NOT NULL DEFAULT 'FAILED',
    
    -- Execution / Recovery
    recovered INTEGER NOT NULL DEFAULT 0, -- 0 or 1
    amount_recovered_paise INTEGER NOT NULL DEFAULT 0,
    conversation_json TEXT, -- List of messages: [{"sender": "bot"|"user", "text": "...", "timestamp": "..."}]
    
    -- System metrics
    degraded INTEGER NOT NULL DEFAULT 0,
    degradation_reason TEXT
);
"""

CREATE_INDEX_CASES_CUSTOMER = """
CREATE INDEX IF NOT EXISTS idx_cases_customer ON cases (customer_id);
"""
