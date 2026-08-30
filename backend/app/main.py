# backend/app/main.py
import os
import sys
from pathlib import Path

# Ensure backend root is on Python module search path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import cases, audit, demo, results

from app.websocket.manager import manager
from app.guardrail.kill_switch import kill_switch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Revora Revenue Recovery Engine",
    description="Optimization-driven, Policy-gated Payment Recovery Triage Platform",
    version="2.0.0"
)

# Explicit CORS configuration for split-stack local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(cases.router)
app.include_router(audit.router)
app.include_router(demo.router)
app.include_router(results.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Revora Recovery Triage Engine",
        "kill_switch_active": kill_switch.is_active()
    }


# Native WebSocket Endpoint for Real-time Dashboard Updates
@app.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Broadcast initial kill switch status to client immediately on connect
        await websocket.send_json({
            "type": "kill_switch_state",
            "active": kill_switch.is_active()
        })
        
        while True:
            # Keep connection alive, listen for optional client messages or heartbeats
            data = await websocket.receive_text()
            # Echo or process if needed, else ignore
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error on stream: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
