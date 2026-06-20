import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status, Cookie
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def _make_token(data: dict, expires_delta: timedelta) -> str:
    payload = {**data, "exp": datetime.utcnow() + expires_delta}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _make_token({"sub": user_id, "type": "access"}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: str) -> str:
    return _make_token({"sub": user_id, "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not access_token:
        raise credentials_exc
    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        raise credentials_exc
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise credentials_exc
    return user


def get_current_user_optional(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not access_token:
        return None
    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        return None
    return db.query(User).filter(User.id == payload["sub"]).first()
