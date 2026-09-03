# backend/app/routes/cases.py
import json
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from app.audit.store import AuditStore
from app.revora.execution.promise_tracker import PromiseTracker

from seed.seed_data import get_customer_name

router = APIRouter(prefix="/cases", tags=["cases"])
store = AuditStore()
promise_tracker = PromiseTracker(store)

class SimulateReplyPayload(BaseModel):
    text: str

@router.get("")
def list_cases(
    outcome: Optional[str] = Query(None),
    cause: Optional[str] = Query(None),
    channel: Optional[str] = Query(None)
):
    cases = store.list_cases(outcome=outcome, cause=cause, channel=channel)
    # Add customer name denormalized for convenience
    for c in cases:
        c["customer_name"] = get_customer_name(c["customer_id"])
    return cases

@router.get("/promises")
def list_promises():
    promises = store.get_all_promises()
    for p in promises:
        p["customer_name"] = get_customer_name(p["customer_id"])
    return promises

@router.get("/{id}")
def get_case(id: str):
    case = store.get_case(id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Get active promise details if any
    promise = store.get_active_promise(case["customer_id"])
    case["customer_name"] = get_customer_name(case["customer_id"])
    case["active_promise"] = promise
    return case

@router.post("/{id}/simulate-reply")
def simulate_reply(id: str, payload: SimulateReplyPayload):
    case = store.get_case(id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    commitment = promise_tracker.process_reply(
        failed_payment_id=id,
        customer_id=case["customer_id"],
        reply_text=payload.text
    )
    
    updated_case = store.get_case(id)
    promise = store.get_active_promise(case["customer_id"])
    if updated_case:
        updated_case["customer_name"] = get_customer_name(case["customer_id"])
        updated_case["active_promise"] = promise
        
    return {
        "commitment": commitment.model_dump(),
        "case": updated_case
    }
