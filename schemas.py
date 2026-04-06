from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# --- Auth schemas ---

class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


# --- Space schemas ---

class SpaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SpaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MemberResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True


class SpaceDetailResponse(SpaceResponse):
    members: List[MemberResponse] = []
    item_count: int = 0


# --- Invite schemas ---

class InviteCreate(BaseModel):
    space_id: int


class InviteResponse(BaseModel):
    token: str
    space_name: str
    expires_at: datetime

    class Config:
        from_attributes = True


class InviteAcceptResponse(BaseModel):
    space_id: int
    space_name: str
    message: str


# --- Item schemas ---

class ItemBase(BaseModel):
    name: str
    quantity: int = 1
    unit: str = "шт"
    min_quantity: int = 1
    location: Optional[str] = None
    is_consumable: bool = True


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None
    location: Optional[str] = None
    is_consumable: Optional[bool] = None


class BulkUpdateItem(BaseModel):
    id: int
    quantity: int


class QuantityChange(BaseModel):
    quantity: int = 1


class ItemResponse(ItemBase):
    id: int
    space_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Quantity history schemas ---

class QuantitySnapshotEntry(BaseModel):
    id: int
    quantity: int
    change_type: str
    recorded_at: datetime

    class Config:
        from_attributes = True
