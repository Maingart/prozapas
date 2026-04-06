from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud import get_item, create_item, update_item, delete_item
from database import get_db
from models import Item, Membership, User, QuantitySnapshot
from schemas import ItemCreate, ItemUpdate, ItemResponse, BulkUpdateItem, QuantityChange, QuantitySnapshotEntry
from dependencies import get_current_user, require_membership

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
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    created_item = create_item(db, item, space_id=space_id)
    _record_snapshot(db, created_item.id, created_item.quantity, "create")
    db.commit()
    db.refresh(created_item)
    return created_item


@router.put("/{item_id}", response_model=ItemResponse)
def update_existing_item(
    space_id: int,
    item_id: int,
    item: ItemUpdate,
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
    return updated_item


@router.delete("/{item_id}", response_model=ItemResponse)
def delete_existing_item(
    space_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    return delete_item(db, db_item)


@router.patch("/bulk", response_model=List[ItemResponse])
def bulk_update_items(
    space_id: int,
    updates: List[BulkUpdateItem],
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
    return updated


@router.post("/{item_id}/add", response_model=ItemResponse)
def add_to_item(
    space_id: int,
    item_id: int,
    payload: QuantityChange = QuantityChange(),
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.quantity += payload.quantity
    _record_snapshot(db, item_id, db_item.quantity, "add")
    db.commit()
    db.refresh(db_item)
    return db_item


@router.post("/{item_id}/consume", response_model=ItemResponse)
def consume_from_item(
    space_id: int,
    item_id: int,
    payload: QuantityChange = QuantityChange(),
    current_user: User = Depends(get_current_user),
    _membership: Membership = Depends(require_membership),
    db: Session = Depends(get_db),
):
    db_item = get_item(db, item_id)
    if not db_item or db_item.space_id != space_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.quantity = max(0, db_item.quantity - payload.quantity)
    _record_snapshot(db, item_id, db_item.quantity, "consume")
    db.commit()
    db.refresh(db_item)
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
