"""WebSocket routes for real-time presence tracking."""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from auth_utils import decode_access_token
from database import SessionLocal
from models import Membership
from presence import presence_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/spaces/{space_id}")
async def space_presence_websocket(
    websocket: WebSocket,
    space_id: int,
    token: str = Query(...),
):
    """WebSocket endpoint for space presence tracking.
    
    Clients connect with a JWT token in the query string.
    On connect, broadcasts "join" event to all users in the space.
    On disconnect, broadcasts "leave" event.
    Sends heartbeat every 30 seconds to keep connection alive.
    """
    # Authenticate user
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=4001, reason="Invalid token payload")
        return
    
    user_id = int(user_id_str)
    
    # Verify user is a member of the space
    db = SessionLocal()
    try:
        membership = db.query(Membership).filter(
            Membership.user_id == user_id,
            Membership.space_id == space_id,
        ).first()
        
        if not membership:
            await websocket.close(code=4003, reason="Not a member of this space")
            return
        
        # Get user email from membership relationship
        email = membership.user.email
    finally:
        db.close()
    
    # Connect and manage presence
    await presence_manager.connect(websocket, space_id, user_id, email)
    
    try:
        # Send initial online users list
        initial_message = {
            "event": "init",
            "online_users": presence_manager.get_online_users(space_id),
        }
        await presence_manager.send_message(websocket, initial_message)
        
        # Heartbeat loop - send ping every 30 seconds
        async def heartbeat():
            while True:
                await asyncio.sleep(30)
                await presence_manager.send_message(websocket, {"event": "pong"})
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat())
        
        try:
            # Listen for client messages (pong responses, etc.)
            while True:
                data = await websocket.receive_text()
                # Client can send messages, but we mainly track connect/disconnect
                logger.debug(f"Received message from user {user_id}: {data}")
        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected from space {space_id}")
        finally:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
    finally:
        await presence_manager.disconnect(websocket)
