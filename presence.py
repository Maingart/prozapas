"""WebSocket-based presence tracking for spaces."""

import asyncio
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class PresenceManager:
    """Manages WebSocket connections for space presence tracking.
    
    Tracks which users are online in each space and broadcasts presence changes.
    """
    
    def __init__(self):
        # space_id -> {user_id -> WebSocket}
        self._connections: Dict[int, Dict[int, WebSocket]] = {}
        # WebSocket -> {user_id, space_id, user_email}
        self._ws_meta: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, space_id: int, user_id: int, email: str):
        """Accept WebSocket connection and register user in space."""
        await websocket.accept()
        
        if space_id not in self._connections:
            self._connections[space_id] = {}
        
        self._connections[space_id][user_id] = websocket
        self._ws_meta[websocket] = {
            "user_id": user_id,
            "space_id": space_id,
            "email": email,
        }
        
        logger.info(f"User {user_id} ({email}) connected to space {space_id}")
        await self._broadcast(space_id, user_id, email, "join")
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection and broadcast leave."""
        meta = self._ws_meta.pop(websocket, None)
        if not meta:
            return
        
        user_id = meta["user_id"]
        space_id = meta["space_id"]
        email = meta["email"]
        
        if space_id in self._connections:
            self._connections[space_id].pop(user_id, None)
            # Clean up empty spaces
            if not self._connections[space_id]:
                del self._connections[space_id]
            
            logger.info(f"User {user_id} ({email}) disconnected from space {space_id}")
            await self._broadcast(space_id, user_id, email, "leave")
    
    async def send_message(self, websocket: WebSocket, data: dict):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_json(data)
        except Exception:
            logger.error(f"Failed to send message to WebSocket", exc_info=True)
    
    async def _broadcast(self, space_id: int, user_id: int, email: str, event: str):
        """Broadcast presence event to all users in the space."""
        online_users = self.get_online_users(space_id)
        
        message = {
            "event": event,
            "user_id": user_id,
            "email": email,
            "online_users": online_users,
        }
        
        if space_id in self._connections:
            disconnected = []
            for uid, ws in list(self._connections[space_id].items()):
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append((uid, ws))
            
            # Clean up failed connections
            for uid, ws in disconnected:
                await self._force_disconnect(ws)
    
    async def _force_disconnect(self, websocket: WebSocket):
        """Force disconnect a WebSocket and clean up."""
        meta = self._ws_meta.pop(websocket, None)
        if meta:
            space_id = meta["space_id"]
            user_id = meta["user_id"]
            email = meta["email"]
            
            if space_id in self._connections:
                self._connections[space_id].pop(user_id, None)
                if not self._connections[space_id]:
                    del self._connections[space_id]
    
    def get_online_users(self, space_id: int) -> list[dict]:
        """Get list of online users in a space (without WebSocket objects)."""
        if space_id not in self._connections:
            return []
        
        return [
            {"user_id": uid, "email": self._ws_meta.get(ws, {}).get("email", "")}
            for uid, ws in self._connections[space_id].items()
        ]
    
    def is_user_online(self, space_id: int, user_id: int) -> bool:
        """Check if a specific user is online in a space."""
        return (
            space_id in self._connections
            and user_id in self._connections[space_id]
        )

    async def broadcast_item_change(self, space_id: int, event: str, item_data: dict):
        """Broadcast item change to all users in the space.
        
        Args:
            space_id: The space where the change occurred
            event: One of "item_created", "item_updated", "item_deleted", "item_quantity_changed"
            item_data: The item data (for created/updated) or {"id": item_id} for deleted
        """
        message = {
            "event": event,
            **item_data,
        }

        if space_id in self._connections:
            disconnected = []
            for uid, ws in list(self._connections[space_id].items()):
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append((uid, ws))

            # Clean up failed connections
            for uid, ws in disconnected:
                await self._force_disconnect(ws)


# Global presence manager instance
presence_manager = PresenceManager()
