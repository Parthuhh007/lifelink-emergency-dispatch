from datetime import timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ...core.config import settings
from ...core.database import get_db
from ...core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    UserRole
)
from ...models.user import User
from ...schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user with email and password."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse.model_validate(current_user)


@router.get("/demo-tokens", response_model=Dict[str, Any])
async def get_demo_tokens(db: AsyncSession = Depends(get_db)):
    """Generate ready-to-use JWT tokens for each of the 5 roles to accelerate demonstration and testing."""
    result = await db.execute(select(User))
    users = result.scalars().all()
    tokens = {}
    for u in users:
        token = create_access_token(data={"sub": u.id, "email": u.email, "role": u.role})
        tokens[u.role] = {
            "email": u.email,
            "full_name": u.full_name,
            "token": token,
            "badge_id": u.badge_id
        }
    return tokens
