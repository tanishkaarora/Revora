# backend/app/routes/audit.py
from fastapi import APIRouter, Query
from typing import List, Optional
from app.audit.store import AuditStore
from app.guardrail.types import AuditLogEntry

router = APIRouter(prefix="/audit", tags=["audit"])
store = AuditStore()

@router.get("")
def read_audit_log(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Exposes paginated, read-only access to the append-only audit trail.
    No update or delete routes exist.
    """
    entries = store.get_audit_entries(limit=limit, offset=offset)
    return {
        "limit": limit,
        "offset": offset,
        "count": len(entries),
        "entries": [e.model_dump() for e in entries]
    }
