from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    created_invites = relationship("Invite", back_populates="creator", cascade="all, delete-orphan")


class Space(Base):
    __tablename__ = "spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", foreign_keys=[created_by])
    memberships = relationship("Membership", back_populates="space", cascade="all, delete-orphan")
    items = relationship("Item", back_populates="space", cascade="all, delete-orphan")
    invites = relationship("Invite", back_populates="space", cascade="all, delete-orphan")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=False)
    role = Column(String, nullable=False, default="member")  # owner / member
    joined_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="memberships")
    space = relationship("Space", back_populates="memberships")


class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    space = relationship("Space", back_populates="invites")
    creator = relationship("User", back_populates="created_invites")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit = Column(String, default="шт")
    min_quantity = Column(Integer, default=1)
    location = Column(String, nullable=True)
    is_consumable = Column(Boolean, default=True)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    space = relationship("Space", back_populates="items")
    quantity_history = relationship("QuantitySnapshot", back_populates="item", cascade="all, delete-orphan")


class QuantitySnapshot(Base):
    __tablename__ = "quantity_history"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    change_type = Column(String, nullable=False)  # add, consume, update, create
    recorded_at = Column(DateTime, server_default=func.now())

    item = relationship("Item", back_populates="quantity_history")
