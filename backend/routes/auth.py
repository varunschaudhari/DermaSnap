"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Dict, Any
import secrets
import logging
from bson import ObjectId

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.user import (
    UserCreate, UserLogin, UserResponse, PasswordReset, 
    PasswordResetConfirm, OAuthToken
)
from auth.auth import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_access_token, UserRole
)
from auth.dependencies import get_current_user
from server import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password if provided
        hashed_password = None
        if user_data.password:
            hashed_password = get_password_hash(user_data.password)
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "hashed_password": hashed_password,
            "oauth_provider": user_data.oauth_provider,
            "oauth_id": user_data.oauth_id,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user_id, "email": user_data.email, "role": user_data.role}
        )
        refresh_token = create_refresh_token(
            data={"sub": user_id, "email": user_data.email}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "role": user_data.role,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Dict[str, Any])
async def login(credentials: UserLogin):
    """Login with email and password"""
    try:
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not user.get("hashed_password"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password not set. Please use OAuth or reset password."
            )
        
        if not verify_password(credentials.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        user_id = str(user["_id"])
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user_id, "email": user["email"], "role": user["role"]}
        )
        refresh_token = create_refresh_token(
            data={"sub": user_id, "email": user["email"]}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/oauth/google", response_model=Dict[str, Any])
async def oauth_google(oauth_data: OAuthToken):
    """OAuth login/register with Google"""
    try:
        # TODO: Verify Google token
        # For now, we'll accept the token and create/find user
        # In production, verify the token with Google's API
        
        # Extract email from token (simplified - should verify token first)
        # This is a placeholder - implement proper Google token verification
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not yet implemented. Please use email/password."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed"
        )

@router.post("/oauth/apple", response_model=Dict[str, Any])
async def oauth_apple(oauth_data: OAuthToken):
    """OAuth login/register with Apple"""
    try:
        # TODO: Verify Apple token
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Apple OAuth not yet implemented. Please use email/password."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple OAuth error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed"
        )

@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        payload = decode_access_token(refresh_token)
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user identifier in token"
            )
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        access_token = create_access_token(
            data={"sub": user_id, "email": user["email"], "role": user["role"]}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token"
        )

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (client should discard tokens)"""
    # In a stateless JWT system, logout is handled client-side
    # Optionally, you could maintain a blacklist of tokens
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(reset_data: PasswordReset):
    """Request password reset"""
    try:
        user = await db.users.find_one({"email": reset_data.email})
        if not user:
            # Don't reveal if email exists
            return {"message": "If email exists, reset link has been sent"}
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.utcnow() + timedelta(hours=1)
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": reset_expires
                }
            }
        )
        
        # TODO: Send email with reset link
        # For now, return token (in production, send email)
        return {
            "message": "Password reset token generated",
            "token": reset_token  # Remove in production
        }
    except Exception as e:
        logger.error(f"Password reset error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

@router.post("/reset-password")
async def reset_password(reset_data: PasswordResetConfirm):
    """Reset password using token"""
    try:
        user = await db.users.find_one({"password_reset_token": reset_data.token})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Check if token expired
        if user.get("password_reset_expires") < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token expired"
            )
        
        # Update password
        hashed_password = get_password_hash(reset_data.new_password)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_password,
                    "password_reset_token": None,
                    "password_reset_expires": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    user_id = current_user.get("id")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token"
        )
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "created_at": user.get("created_at"),
    }
