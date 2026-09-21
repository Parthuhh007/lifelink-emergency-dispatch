import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("lifelink.ws")


class ConnectionManager:
    """Manages active WebSocket client connections for real-time telemetry streaming."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, channel: str, data: Dict[str, Any]):
        """Broadcast message to all connected clients."""
        if not self.active_connections:
            return
        payload = json.dumps({"channel": channel, "data": data})
        stale = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)

        for conn in stale:
            self.disconnect(conn)


ws_manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """WebSocket route handler."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients may send ping or filter preferences
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
