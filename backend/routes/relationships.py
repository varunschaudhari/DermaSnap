"""
Doctor-Patient relationship management routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.relationship import RelationshipCreate, RelationshipResponse, RelationshipStatus, InviteCodeResponse
from auth.dependencies import get_current_user, get_current_doctor, get_current_patient, get_current_admin
from server import db

router = APIRouter(prefix="/relationships", tags=["relationships"])

def generate_invite_code() -> str:
    """Generate a unique invite code"""
    return secrets.token_urlsafe(8).upper()[:8]

@router.post("/invite", response_model=Dict[str, Any])
async def create_invite_code(
    current_user: dict = Depends(get_current_doctor)
):
    """Create an invite code for patients to join"""
    try:
        invite_code = generate_invite_code()
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Store invite code
        invite_doc = {
            "doctor_id": current_user["id"],
            "invite_code": invite_code,
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
            "used": False
        }
        
        await db.invite_codes.insert_one(invite_doc)
        
        return {
            "invite_code": invite_code,
            "expires_at": expires_at.isoformat(),
            "message": "Invite code created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create invite code: {str(e)}"
        )

@router.post("/join", response_model=Dict[str, Any])
async def join_with_invite_code(
    invite_code: str,
    current_user: dict = Depends(get_current_patient)
):
    """Join a doctor using invite code"""
    try:
        # Find invite code
        invite = await db.invite_codes.find_one({
            "invite_code": invite_code.upper(),
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invite code"
            )
        
        doctor_id = invite["doctor_id"]
        
        # Check if relationship already exists
        existing = await db.relationships.find_one({
            "doctor_id": doctor_id,
            "patient_id": current_user["id"]
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Relationship already exists"
            )
        
        # Create relationship
        relationship_doc = {
            "doctor_id": doctor_id,
            "patient_id": current_user["id"],
            "status": RelationshipStatus.ACTIVE.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db.relationships.insert_one(relationship_doc)
        
        # Mark invite code as used
        await db.invite_codes.update_one(
            {"_id": invite["_id"]},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        
        return {
            "message": "Successfully joined doctor",
            "relationship_id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join doctor: {str(e)}"
        )

@router.get("/doctors/search", response_model=List[Dict[str, Any]])
async def search_doctors(
    query: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Search for doctors"""
    try:
        search_filter = {
            "role": "doctor",
            "is_active": True
        }
        
        if query:
            search_filter["$or"] = [
                {"full_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ]
        
        doctors = await db.users.find(search_filter).limit(20).to_list(20)
        
        result = []
        for doctor in doctors:
            result.append({
                "id": str(doctor["_id"]),
                "full_name": doctor.get("full_name"),
                "email": doctor.get("email"),
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search doctors: {str(e)}"
        )

@router.post("/request", response_model=Dict[str, Any])
async def request_doctor_connection(
    doctor_id: str,
    current_user: dict = Depends(get_current_patient)
):
    """Request connection to a doctor"""
    try:
        if not ObjectId.is_valid(doctor_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid doctor ID"
            )
        
        # Verify doctor exists
        doctor = await db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor"})
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Check if relationship already exists
        existing = await db.relationships.find_one({
            "doctor_id": doctor_id,
            "patient_id": current_user["id"]
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Relationship already exists"
            )
        
        # Create pending relationship
        relationship_doc = {
            "doctor_id": doctor_id,
            "patient_id": current_user["id"],
            "status": RelationshipStatus.PENDING.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db.relationships.insert_one(relationship_doc)
        
        return {
            "message": "Connection request sent",
            "relationship_id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request connection: {str(e)}"
        )

@router.get("/patients", response_model=List[Dict[str, Any]])
async def get_doctor_patients(
    current_user: dict = Depends(get_current_doctor)
):
    """Get all patients for a doctor"""
    try:
        relationships = await db.relationships.find({
            "doctor_id": current_user["id"],
            "status": RelationshipStatus.ACTIVE.value
        }).to_list(100)
        
        patient_ids = [rel["patient_id"] for rel in relationships]
        
        patients = await db.users.find({
            "_id": {"$in": [ObjectId(pid) for pid in patient_ids]}
        }).to_list(100)
        
        result = []
        for patient in patients:
            result.append({
                "id": str(patient["_id"]),
                "full_name": patient.get("full_name"),
                "email": patient.get("email"),
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve patients: {str(e)}"
        )

@router.get("/doctors", response_model=List[Dict[str, Any]])
async def get_patient_doctors(
    current_user: dict = Depends(get_current_user)
):
    """Get all doctors for a patient"""
    try:
        relationships = await db.relationships.find({
            "patient_id": current_user["id"],
            "status": RelationshipStatus.ACTIVE.value
        }).to_list(100)
        
        doctor_ids = [rel["doctor_id"] for rel in relationships]
        
        doctors = await db.users.find({
            "_id": {"$in": [ObjectId(did) for did in doctor_ids]}
        }).to_list(100)
        
        result = []
        for doctor in doctors:
            result.append({
                "id": str(doctor["_id"]),
                "full_name": doctor.get("full_name"),
                "email": doctor.get("email"),
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve doctors: {str(e)}"
        )

@router.post("/assign", response_model=Dict[str, Any])
async def admin_assign_patient(
    patient_id: str,
    doctor_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Admin assign patient to doctor"""
    try:
        if not ObjectId.is_valid(patient_id) or not ObjectId.is_valid(doctor_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID"
            )
        
        # Verify users exist and have correct roles
        patient = await db.users.find_one({"_id": ObjectId(patient_id), "role": "patient"})
        doctor = await db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor"})
        
        if not patient or not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient or doctor not found"
            )
        
        # Check if relationship exists
        existing = await db.relationships.find_one({
            "doctor_id": doctor_id,
            "patient_id": patient_id
        })
        
        if existing:
            # Update to active
            await db.relationships.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "status": RelationshipStatus.ACTIVE.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        else:
            # Create new relationship
            relationship_doc = {
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "status": RelationshipStatus.ACTIVE.value,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await db.relationships.insert_one(relationship_doc)
        
        return {"message": "Patient assigned to doctor successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign patient: {str(e)}"
        )
