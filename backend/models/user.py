"""
User model and schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = Field(..., pattern="^(patient|doctor|admin)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    oauth_provider: Optional[str] = None
    oauth_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserInDB:
    def __init__(self, data: dict):
        self.id = str(data.get("_id", data.get("id")))
        self.email = data.get("email")
        self.full_name = data.get("full_name")
        self.role = data.get("role")
        self.hashed_password = data.get("hashed_password")
        self.oauth_provider = data.get("oauth_provider")
        self.oauth_id = data.get("oauth_id")
        self.is_active = data.get("is_active", True)
        self.created_at = data.get("created_at", datetime.utcnow())
        self.updated_at = data.get("updated_at", datetime.utcnow())
        self.password_reset_token = data.get("password_reset_token")
        self.password_reset_expires = data.get("password_reset_expires")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class OAuthToken(BaseModel):
    provider: str = Field(..., pattern="^(google|apple)$")
    token: str
    id_token: Optional[str] = None
