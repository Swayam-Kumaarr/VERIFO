import os
import uuid
from datetime import datetime

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from database import get_db
from models import User

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_OPTS = dict(httponly=True, samesite="lax", secure=False)  # set secure=True in prod


def _set_tokens(response: Response, user_id: str):
    response.set_cookie("access_token", create_access_token(user_id), max_age=3600, **COOKIE_OPTS)
    response.set_cookie("refresh_token", create_refresh_token(user_id), max_age=86400 * 30, **COOKIE_OPTS)


# ── schemas ──────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str
    role: str = "developer"


class LoginBody(BaseModel):
    email: str
    password: str


class GitHubConnectBody(BaseModel):
    github_token: str
    github_username: str
    github_name: str
    github_avatar_url: str
    github_email: str | None = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "githubConnected": bool(user.github_token),
        "githubUsername": user.github_username,
        "githubAvatarUrl": user.github_avatar_url,
        "avatarInitial": (user.name or "?")[0].upper(),
        "joinedAt": user.created_at.isoformat(),
        "emailVerified": user.email_verified,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        name=body.name.strip(),
        hashed_password=hash_password(body.password),
        role=body.role,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_tokens(response, user.id)
    return {"user": _user_dict(user)}


@router.post("/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _set_tokens(response, user.id)
    return {"user": _user_dict(user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"ok": True}


@router.post("/guest")
def guest(response: Response, db: Session = Depends(get_db)):
    """Create a throwaway guest account and sign in. No password, no email verification."""
    suffix = uuid.uuid4().hex[:8]
    user = User(
        id=str(uuid.uuid4()),
        email=f"guest-{suffix}@nexora.local",
        name=f"Guest {suffix[:4]}",
        role="developer",
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_tokens(response, user.id)
    return {"user": _user_dict(user)}


@router.post("/refresh")
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    _set_tokens(response, user.id)
    return {"user": _user_dict(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"user": _user_dict(current_user)}


class UpdateProfileBody(BaseModel):
    name: str | None = None
    email: str | None = None


@router.patch("/me")
def update_me(
    body: UpdateProfileBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = body.email
    db.commit()
    db.refresh(current_user)
    return {"user": _user_dict(current_user)}


@router.post("/github/connect")
def github_connect(
    body: GitHubConnectBody,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.github_token = body.github_token
    current_user.github_username = body.github_username
    current_user.github_avatar_url = body.github_avatar_url
    if body.github_name and not current_user.name:
        current_user.name = body.github_name
    db.commit()
    db.refresh(current_user)
    return {"user": _user_dict(current_user)}


@router.post("/github/disconnect")
def github_disconnect(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.github_token = None
    current_user.github_username = None
    current_user.github_avatar_url = None
    db.commit()
    db.refresh(current_user)
    return {"user": _user_dict(current_user)}


@router.post("/github/login")
async def github_login(body: GitHubConnectBody, response: Response, db: Session = Depends(get_db)):
    """Create or find account by GitHub identity, issue tokens — no password needed."""
    # Look up by GitHub username first, then by email
    user = db.query(User).filter(User.github_username == body.github_username).first()
    if not user and body.github_email:
        user = db.query(User).filter(User.email == body.github_email).first()

    if not user:
        # Create new account from GitHub data
        email = body.github_email or f"{body.github_username}@github.nexora"
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=body.github_name or body.github_username,
            role="developer",
            github_token=body.github_token,
            github_username=body.github_username,
            github_avatar_url=body.github_avatar_url,
            email_verified=bool(body.github_email),
            created_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        user.github_token = body.github_token
        user.github_username = body.github_username
        user.github_avatar_url = body.github_avatar_url

    db.commit()
    db.refresh(user)
    _set_tokens(response, user.id)
    return {"user": _user_dict(user)}
