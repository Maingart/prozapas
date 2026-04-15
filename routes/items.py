from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from crud import get_item, create_item, update_item, delete_item
from database import get_db
from models import Item, Membership, User, QuantitySnapshot
from schemas import ItemCreate, ItemUpdate, ItemResponse, BulkUpdateItem, QuantityChange, QuantitySnapshotEntry
from dependencies import get_current_user, require_membership
from presence import presence_manager

router = APIRouter(prefix="/api/spaces/{space_id}/items", tags=["items"])


def _record_snapshot(db: Session, item_id: int, quantity: int, change_type: str):
    """Record a quantity snapshot for history tracking."""
    snapshot = QuantitySnapshot(
        item_id=item_id,
        quantity=quantity,
        change_type=change_type,
    )
    db.add(snapshot)
    db.flush()


def _get_items(db: Session, space_id: int, skip: int = 0, limit: int = 500):
    return db.query(Item).filter(Item.space_id == space_id).offset(skip).limit(limit).all()


@router.get("", response_model=List[ItemResponse])
def read_items(
    space_id: int,
    skip: int = 0,
    limit: int = 500,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    return _get_items(db, space_id, skip=skip, limit=limit)


@router.get("/{item_id}", response_model=ItemResponse)
def read_item(
    space_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item


@router.post("", response_model=ItemResponse)
def create_new_item(
    space_id: int,
    item: ItemCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    created_item = create_item(db, item, space_id=space_id)
    _record_snapshot(db, created_item.id, created_item.quantity, "create")
    db.commit()
    db.refresh(created_item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_created",
        item_data={"id": created_item.id, "name": created_item.name, "quantity": created_item.quantity, "unit": created_item.unit, "min_quantity": created_item.min_quantity, "location": created_item.location, "is_consumable": created_item.is_consumable, "space_id": created_item.space_id, "created_at": created_item.created_at, "updated_at": created_item.updated_at},
    )
    return created_item


@router.put("/{item_id}", response_model=ItemResponse)
def update_existing_item(
    space_id: int,
    item_id: int,
    item: ItemUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = update_item(db, db_item, item)
    if item.quantity is not None:
        _record_snapshot(db, item_id, updated_item.quantity, "update")
        db.commit()
        db.refresh(updated_item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_updated",
        item_data={"id": updated_item.id, "name": updated_item.name, "quantity": updated_item.quantity, "unit": updated_item.unit, "min_quantity": updated_item.min_quantity, "location": updated_item.location, "is_consumable": updated_item.is_consumable, "space_id": updated_item.space_id, "created_at": updated_item.created_at.isoformat(), "updated_at": updated_item.updated_at.isoformat()},
    )
    return updated_item


@router.delete("/{item_id}", response_model=ItemResponse)
def delete_existing_item(
    space_id: int,
    item_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    deleted_item = delete_item(db, db_item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_deleted",
        item_data={"id": deleted_item.id},
    )
    return deleted_item


@router.patch("/bulk", response_model=List[ItemResponse])
def bulk_update_items(
    space_id: int,
    updates: List[BulkUpdateItem],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    updated = []
    for update_data in updates:
        db_item = get_item(db, update_data.id)
        if not db_item or db_item.space_id != space_id:
            raise HTTPException(status_code=404, detail=f"Item {update_data.id} not found")
        db_item.quantity = update_data.quantity
        _record_snapshot(db, update_data.id, update_data.quantity, "update")
        db.add(db_item)
        db.flush()
        updated.append(db_item)
    db.commit()
    for item in updated:
        db.refresh(item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_updated",
        item_data={"bulk": True, "items": [{"id": item.id, "quantity": item.quantity} for item in updated]},
    )
    return updated


@router.post("/{item_id}/add", response_model=ItemResponse)
def add_to_item(
    space_id: int,
    item_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
    payload: QuantityChange = QuantityChange(),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.quantity += payload.quantity
    _record_snapshot(db, item_id, db_item.quantity, "add")
    db.commit()
    db.refresh(db_item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_updated",
        item_data={"id": db_item.id, "name": db_item.name, "quantity": db_item.quantity, "unit": db_item.unit, "min_quantity": db_item.min_quantity, "location": db_item.location, "is_consumable": db_item.is_consumable, "space_id": db_item.space_id, "created_at": db_item.created_at.isoformat(), "updated_at": db_item.updated_at.isoformat()},
    )
    return db_item


@router.post("/{item_id}/consume", response_model=ItemResponse)
def consume_from_item(
    space_id: int,
    item_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
    payload: QuantityChange = QuantityChange(),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.quantity = max(0, db_item.quantity - payload.quantity)
    _record_snapshot(db, item_id, db_item.quantity, "consume")
    db.commit()
    db.refresh(db_item)
    
    # Broadcast to other users in the space
    background_tasks.add_task(
        presence_manager.broadcast_item_change,
        space_id=space_id,
        event="item_updated",
        item_data={"id": db_item.id, "name": db_item.name, "quantity": db_item.quantity, "unit": db_item.unit, "min_quantity": db_item.min_quantity, "location": db_item.location, "is_consumable": db_item.is_consumable, "space_id": db_item.space_id, "created_at": db_item.created_at.isoformat(), "updated_at": db_item.updated_at.isoformat()},
    )
    return db_item


@router.get("/{item_id}/history", response_model=List[QuantitySnapshotEntry])
def get_item_history(
    space_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    history = (
        db.query(QuantitySnapshot)
        .filter(QuantitySnapshot.item_id == item_id)
        .order_by(QuantitySnapshot.recorded_at.asc())
        .all()
    )
    return history
