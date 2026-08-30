# backend/app/websocket/manager.py
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send websocket message, marks for removal: {e}")
                disconnected_sockets.append(connection)
                
        # Clean up stale connections
        for connection in disconnected_sockets:
            self.disconnect(connection)

    async def broadcast_kill_switch(self, active: bool):
        await self.broadcast({
            "type": "kill_switch_state",
            "active": active
        })

    async def broadcast_audit_entry(self, entry_dict: dict):
        await self.broadcast({
            "type": "audit_entry",
            "data": entry_dict
        })

manager = ConnectionManager()
