from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, Space, Membership, Invite, Item
from schemas import SpaceCreate, SpaceResponse, SpaceDetailResponse, MemberResponse, InviteCreate, InviteResponse, InviteAcceptResponse
from dependencies import get_current_user, require_membership

router = APIRouter(prefix="/api", tags=["spaces"])


# --- Spaces ---

@router.get("/spaces")
def list_spaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = (
        db.query(Membership.space_id, Membership.role)
        .filter(Membership.user_id == current_user.id)
        .all()
    )
    membership_map = {m.space_id: m.role for m in memberships}
    space_ids = list(membership_map.keys())
    
    spaces = db.query(Space).filter(Space.id.in_(space_ids)).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "created_at": s.created_at,
            "role": membership_map.get(s.id),
        }
        for s in spaces
    ]


@router.post("/spaces", response_model=SpaceResponse)
def create_space(
    payload: SpaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = Space(name=payload.name, description=payload.description, created_by=current_user.id)
    db.add(space)
    db.flush()

    membership = Membership(user_id=current_user.id, space_id=space.id, role="owner")
    db.add(membership)
    db.commit()
    db.refresh(space)
    return space


@router.get("/spaces/{space_id}", response_model=SpaceDetailResponse)
def get_space(
    space_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == space_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="No access to this space")

    space = db.query(Space).filter(Space.id == space_id).first()
    members = (
        db.query(User, Membership.role)
        .join(Membership, User.id == Membership.user_id)
        .filter(Membership.space_id == space_id)
        .all()
    )
    item_count = db.query(func.count(Item.id)).filter(Item.space_id == space_id).scalar() or 0

    return {
        "id": space.id,
        "name": space.name,
        "description": space.description,
        "created_at": space.created_at,
        "members": [{"id": u.id, "email": u.email, "role": r} for u, r in members],
        "item_count": item_count,
    }


@router.delete("/spaces/{space_id}")
def delete_space(
    space_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == space_id,
    ).first()
    if not membership or membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete a space")

    space = db.query(Space).filter(Space.id == space_id).first()
    db.delete(space)
    db.commit()
    return {"message": "Space deleted"}


@router.delete("/spaces/{space_id}/members/{user_id}")
def remove_member(
    space_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check that current user is the owner of the space
    owner_membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == space_id,
    ).first()
    if not owner_membership or owner_membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can remove members")

    # Find the membership to remove
    target_membership = db.query(Membership).filter(
        Membership.user_id == user_id,
        Membership.space_id == space_id,
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found in this space")

    # Prevent removing the last owner
    if target_membership.role == "owner":
        owner_count = db.query(func.count(Membership.id)).filter(
            Membership.space_id == space_id,
            Membership.role == "owner",
        ).scalar()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last owner")

    db.delete(target_membership)
    db.commit()
    return {"message": "Member removed", "user_id": user_id}


@router.delete("/spaces/{space_id}/leave")
def leave_space(
    space_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find the membership
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == space_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Not a member of this space")

    # Prevent owner from leaving
    if membership.role == "owner":
        raise HTTPException(status_code=400, detail="Owner cannot leave the space. Transfer ownership first or delete the space.")

    db.delete(membership)
    db.commit()
    return {"message": "Left space successfully", "space_id": space_id}


# --- Invites ---

@router.post("/spaces/{space_id}/invites", response_model=InviteResponse)
def create_invite(
    space_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == space_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="No access to this space")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=48)

    invite = Invite(space_id=space_id, token=token, created_by=current_user.id, expires_at=expires_at)
    db.add(invite)
    db.commit()
    db.refresh(invite)

    space = db.query(Space).filter(Space.id == space_id).first()
    return {
        "token": invite.token,
        "space_name": space.name,
        "expires_at": invite.expires_at,
    }


@router.get("/invites/{token}", response_model=InviteAcceptResponse)
def accept_invite(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite expired")

    existing = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.space_id == invite.space_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this space")

    new_membership = Membership(user_id=current_user.id, space_id=invite.space_id, role="member")
    db.add(new_membership)
    invite.used = True
    db.commit()

    space = db.query(Space).filter(Space.id == invite.space_id).first()
    return {"space_id": space.id, "space_name": space.name, "message": "Joined space"}
