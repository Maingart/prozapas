from sqlalchemy.orm import Session

from models import Item
from schemas import ItemCreate, ItemUpdate


def get_items(db: Session, space_id: int = None, skip: int = 0, limit: int = 100):
    q = db.query(Item)
    if space_id is not None:
        q = q.filter(Item.space_id == space_id)
    return q.offset(skip).limit(limit).all()


def get_item(db: Session, item_id: int):
    return db.query(Item).filter(Item.id == item_id).first()


def create_item(db: Session, item: ItemCreate, space_id: int = None):
    data = item.model_dump()
    data["space_id"] = space_id
    db_item = Item(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_item(db: Session, db_item: Item, item: ItemUpdate):
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_item(db: Session, db_item: Item):
    db.delete(db_item)
    db.commit()
    return db_item
