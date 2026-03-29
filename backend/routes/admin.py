"""
Admin routes for system management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from bson import ObjectId
from datetime import datetime
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from auth.dependencies import get_current_admin
from auth.auth import get_password_hash
from server import db

router = APIRouter(prefix="/admin", tags=["admin"])

from pydantic import BaseModel, EmailStr, Field
class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    role: str = Field(..., min_length=2)
    password: str | None = Field(default=None, min_length=8)
    # New fields
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    address: str | None = None
    pincode: str | None = None
    dob: str | None = None            # ISO date (YYYY-MM-DD)
    gender: str | None = None         # freeform or controlled by UI
    mobile: str | None = None         # E.164 preferred

class AdminUserUpdate(BaseModel):
    # Updatable via JSON body
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    address: str | None = None
    pincode: str | None = None
    dob: str | None = None
    gender: str | None = None
    mobile: str | None = None

@router.get("/users", response_model=List[Dict[str, Any]])
async def list_all_users(
    role: str = None,
    limit: int = 50,
    skip: int = 0,
    include_deleted: bool = False,
    current_user: dict = Depends(get_current_admin)
):
    """List all users"""
    try:
        query = {} if include_deleted else {"is_deleted": {"$ne": True}}
        if role:
            query["role"] = role
        
        users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
        
        result = []
        for user in users:
            result.append({
                "id": str(user["_id"]),
                "email": user.get("email"),
                "full_name": user.get("full_name"),
                "role": user.get("role"),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users: {str(e)}"
        )

@router.put("/users/{user_id}", response_model=Dict[str, Any])
async def update_user(
    user_id: str,
    is_active: bool = None,
    role: str = None,
    payload: AdminUserUpdate | None = None,
    current_user: dict = Depends(get_current_admin)
):
    """Update user"""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        update_dict = {"updated_at": datetime.utcnow()}
        if is_active is not None:
            update_dict["is_active"] = is_active
        if role is not None:
            # Accept any role string (custom roles supported via roles module)
            update_dict["role"] = role
        if payload:
            if payload.height_cm is not None:
                update_dict["height_cm"] = float(payload.height_cm)
            if payload.weight_kg is not None:
                update_dict["weight_kg"] = float(payload.weight_kg)
            if payload.bmi is not None:
                update_dict["bmi"] = float(payload.bmi)
            if payload.address is not None:
                update_dict["address"] = payload.address
            if payload.pincode is not None:
                update_dict["pincode"] = payload.pincode
            if payload.dob is not None:
                update_dict["dob"] = payload.dob
            if payload.gender is not None:
                update_dict["gender"] = payload.gender
            if payload.mobile is not None:
                update_dict["mobile"] = payload.mobile
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict}
        )
        
        return {"message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete user"""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        # Prevent self-deletion
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        # Soft delete
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {"message": "User deleted (soft) successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Restore a softly deleted user."""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_deleted": False}, "$unset": {"deleted_at": ""}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User restored successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore user: {str(e)}")

@router.post("/users", response_model=Dict[str, Any], status_code=201)
async def create_user(
    payload: AdminUserCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create a new user (admin action)."""
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    now = datetime.utcnow()
    user_doc = {
        "email": payload.email,
        "full_name": payload.full_name,
        "role": payload.role,
        "hashed_password": get_password_hash(payload.password) if payload.password else None,
        "oauth_provider": None,
        "oauth_id": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    # Optional new fields
    if payload.height_cm is not None:
        user_doc["height_cm"] = float(payload.height_cm)
    if payload.weight_kg is not None:
        user_doc["weight_kg"] = float(payload.weight_kg)
    if payload.bmi is not None:
        user_doc["bmi"] = float(payload.bmi)
    if payload.address is not None:
        user_doc["address"] = payload.address
    if payload.pincode is not None:
        user_doc["pincode"] = payload.pincode
    if payload.dob is not None:
        user_doc["dob"] = payload.dob
    if payload.gender is not None:
        user_doc["gender"] = payload.gender
    if payload.mobile is not None:
        user_doc["mobile"] = payload.mobile
    result = await db.users.insert_one(user_doc)
    return {
        "id": str(result.inserted_id),
        "email": payload.email,
        "full_name": payload.full_name,
        "role": payload.role,
        "is_active": True,
        "created_at": now,
    }

@router.get("/stats", response_model=Dict[str, Any])
async def get_system_stats(
    current_user: dict = Depends(get_current_admin)
):
    """Get system statistics"""
    try:
        base_filter = {"is_deleted": {"$ne": True}}
        total_users = await db.users.count_documents(base_filter)
        total_patients = await db.users.count_documents({"role": "patient", **base_filter})
        total_doctors = await db.users.count_documents({"role": "doctor", **base_filter})
        total_scans = await db.scans.count_documents({})
        total_treatments = await db.treatments.count_documents({})
        total_relationships = await db.relationships.count_documents({})
        
        return {
            "users": {
                "total": total_users,
                "patients": total_patients,
                "doctors": total_doctors,
            },
            "scans": {
                "total": total_scans,
            },
            "treatments": {
                "total": total_treatments,
            },
            "relationships": {
                "total": total_relationships,
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )

@router.get("/performance", response_model=Dict[str, Any])
async def get_ai_performance(
    current_user: dict = Depends(get_current_admin)
):
    """Get AI model performance metrics"""
    try:
        # Placeholder for AI performance metrics
        # In production, this would query performance tracking data
        return {
            "yolo_model": {
                "version": "yolov8-nano",
                "accuracy": "N/A",
                "inference_time": "N/A",
            },
            "analysis_metrics": {
                "total_analyses": await db.scans.count_documents({}),
                "success_rate": "N/A",
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance metrics: {str(e)}"
        )
