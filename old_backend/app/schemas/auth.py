from typing import Optional
from pydantic import BaseModel, ConfigDict
from ..core.security import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    organization: Optional[str] = None
    badge_id: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization: Optional[str] = None
    badge_id: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str
