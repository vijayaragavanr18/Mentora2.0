"""Auth Router — register, login, /me."""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from passlib.context import CryptContext
from jose import jwt

from database.connection import get_db
from models.user import UserORM, RegisterRequest, LoginRequest, UserOut, TokenResponse
from config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: str, expires_delta: timedelta = timedelta(days=7)) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None


# ── Dependency: current user ───────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordBearer

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2),
    db: AsyncSession = Depends(get_db),
) -> Optional[UserORM]:
    if not token:
        return None
    user_id = decode_token(token)
    if not user_id:
        return None
    result = await db.execute(select(UserORM).where(UserORM.id == user_id))
    return result.scalar_one_or_none()


async def require_user(
    user: Optional[UserORM] = Depends(get_current_user),
) -> UserORM:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(UserORM).where(UserORM.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = UserORM(
        id=uuid.uuid4(),
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        grade=body.grade,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    user_out = UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        grade=user.grade,
        created_at=user.created_at,
    )
    return TokenResponse(access_token=token, user=user_out)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserORM).where(UserORM.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(str(user.id))
    user_out = UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        grade=user.grade,
        created_at=user.created_at,
    )
    return TokenResponse(access_token=token, user=user_out)


@router.get("/me", response_model=UserOut)
async def me(user: UserORM = Depends(require_user)):
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        grade=user.grade,
        created_at=user.created_at,
    )
