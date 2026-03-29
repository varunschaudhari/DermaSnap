"""
Treatment management routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.treatment import TreatmentCreate, TreatmentUpdate, TreatmentResponse, TreatmentStatus
from auth.dependencies import get_current_user, get_current_patient, get_current_doctor
from server import db

router = APIRouter(prefix="/treatments", tags=["treatments"])

def calculate_end_date(start_date: datetime, duration_days: int) -> datetime:
    """Calculate treatment end date"""
    return start_date + timedelta(days=duration_days)

def calculate_reminder_date(end_date: datetime, reminder_days_before: int) -> datetime:
    """Calculate reminder date"""
    return end_date - timedelta(days=reminder_days_before)

@router.post("", response_model=Dict[str, Any])
async def create_treatment(
    treatment_data: TreatmentCreate,
    current_user: dict = Depends(get_current_doctor)
):
    """Create a new treatment plan"""
    try:
        # Verify patient exists
        patient = await db.users.find_one({"_id": ObjectId(treatment_data.patient_id)})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Verify patient role
        if patient.get("role") != "patient":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a patient"
            )
        
        # Set start date if not provided
        start_date = treatment_data.start_date or datetime.utcnow()
        end_date = calculate_end_date(start_date, treatment_data.duration_days)
        reminder_date = calculate_reminder_date(end_date, treatment_data.reminder_days_before)
        
        # Create treatment document
        treatment_doc = {
            "product_name": treatment_data.product_name,
            "frequency": treatment_data.frequency,
            "duration_days": treatment_data.duration_days,
            "notes": treatment_data.notes,
            "diagnosis": treatment_data.diagnosis,
            "patient_id": treatment_data.patient_id,
            "doctor_id": current_user["id"],
            "status": TreatmentStatus.ACTIVE.value,
            "start_date": start_date,
            "end_date": end_date,
            "reminder_date": reminder_date,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db.treatments.insert_one(treatment_doc)
        treatment_id = str(result.inserted_id)
        
        # Schedule reminder (would integrate with reminder service)
        # TODO: Add to reminder queue
        
        return {
            "id": treatment_id,
            "message": "Treatment plan created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create treatment: {str(e)}"
        )

@router.get("", response_model=List[Dict[str, Any]])
async def get_treatments(
    patient_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get treatments for current user or specific patient"""
    try:
        query = {}
        
        # Patients can only see their own treatments
        if current_user["role"] == "patient":
            query["patient_id"] = current_user["id"]
        # Doctors can see their patients' treatments
        elif current_user["role"] == "doctor":
            if patient_id:
                query["patient_id"] = patient_id
                query["doctor_id"] = current_user["id"]
            else:
                query["doctor_id"] = current_user["id"]
        # Admins can see all
        elif current_user["role"] == "admin":
            if patient_id:
                query["patient_id"] = patient_id
        
        treatments = await db.treatments.find(query).sort("created_at", -1).to_list(100)
        
        result = []
        for treatment in treatments:
            result.append({
                "id": str(treatment["_id"]),
                "product_name": treatment.get("product_name"),
                "frequency": treatment.get("frequency"),
                "duration_days": treatment.get("duration_days"),
                "notes": treatment.get("notes"),
                "diagnosis": treatment.get("diagnosis"),
                "patient_id": treatment.get("patient_id"),
                "doctor_id": treatment.get("doctor_id"),
                "status": treatment.get("status"),
                "start_date": treatment.get("start_date"),
                "end_date": treatment.get("end_date"),
                "reminder_date": treatment.get("reminder_date"),
                "created_at": treatment.get("created_at"),
                "updated_at": treatment.get("updated_at"),
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve treatments: {str(e)}"
        )

@router.get("/{treatment_id}", response_model=Dict[str, Any])
async def get_treatment(
    treatment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific treatment"""
    try:
        if not ObjectId.is_valid(treatment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid treatment ID"
            )
        
        treatment = await db.treatments.find_one({"_id": ObjectId(treatment_id)})
        if not treatment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient" and treatment.get("patient_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return {
            "id": str(treatment["_id"]),
            "product_name": treatment.get("product_name"),
            "frequency": treatment.get("frequency"),
            "duration_days": treatment.get("duration_days"),
            "notes": treatment.get("notes"),
            "diagnosis": treatment.get("diagnosis"),
            "patient_id": treatment.get("patient_id"),
            "doctor_id": treatment.get("doctor_id"),
            "status": treatment.get("status"),
            "start_date": treatment.get("start_date"),
            "end_date": treatment.get("end_date"),
            "reminder_date": treatment.get("reminder_date"),
            "created_at": treatment.get("created_at"),
            "updated_at": treatment.get("updated_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve treatment: {str(e)}"
        )

@router.put("/{treatment_id}", response_model=Dict[str, Any])
async def update_treatment(
    treatment_id: str,
    treatment_data: TreatmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a treatment plan"""
    try:
        if not ObjectId.is_valid(treatment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid treatment ID"
            )
        
        treatment = await db.treatments.find_one({"_id": ObjectId(treatment_id)})
        if not treatment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment not found"
            )
        
        # Check permissions (only doctor who created it or admin)
        if current_user["role"] == "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients cannot update treatments"
            )
        
        if current_user["role"] == "doctor" and treatment.get("doctor_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Build update dict
        update_dict = {"updated_at": datetime.utcnow()}
        if treatment_data.product_name is not None:
            update_dict["product_name"] = treatment_data.product_name
        if treatment_data.frequency is not None:
            update_dict["frequency"] = treatment_data.frequency
        if treatment_data.duration_days is not None:
            update_dict["duration_days"] = treatment_data.duration_days
            # Recalculate end date
            start_date = treatment.get("start_date", datetime.utcnow())
            update_dict["end_date"] = calculate_end_date(start_date, treatment_data.duration_days)
        if treatment_data.notes is not None:
            update_dict["notes"] = treatment_data.notes
        if treatment_data.diagnosis is not None:
            update_dict["diagnosis"] = treatment_data.diagnosis
        if treatment_data.status is not None:
            update_dict["status"] = treatment_data.status.value
        
        await db.treatments.update_one(
            {"_id": ObjectId(treatment_id)},
            {"$set": update_dict}
        )
        
        return {"message": "Treatment updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update treatment: {str(e)}"
        )

@router.delete("/{treatment_id}")
async def delete_treatment(
    treatment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a treatment plan"""
    try:
        if not ObjectId.is_valid(treatment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid treatment ID"
            )
        
        treatment = await db.treatments.find_one({"_id": ObjectId(treatment_id)})
        if not treatment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients cannot delete treatments"
            )
        
        if current_user["role"] == "doctor" and treatment.get("doctor_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        await db.treatments.delete_one({"_id": ObjectId(treatment_id)})
        
        return {"message": "Treatment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete treatment: {str(e)}"
        )

@router.post("/{treatment_id}/complete")
async def complete_treatment(
    treatment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark treatment as completed"""
    try:
        if not ObjectId.is_valid(treatment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid treatment ID"
            )
        
        treatment = await db.treatments.find_one({"_id": ObjectId(treatment_id)})
        if not treatment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient" and treatment.get("patient_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        await db.treatments.update_one(
            {"_id": ObjectId(treatment_id)},
            {
                "$set": {
                    "status": TreatmentStatus.COMPLETED.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Treatment marked as completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete treatment: {str(e)}"
        )

@router.get("/reminders/upcoming", response_model=List[Dict[str, Any]])
async def get_upcoming_reminders(
    current_user: dict = Depends(get_current_user)
):
    """Get upcoming treatment reminders"""
    try:
        query = {
            "status": TreatmentStatus.ACTIVE.value,
            "reminder_date": {"$lte": datetime.utcnow() + timedelta(days=7)}
        }
        
        if current_user["role"] == "patient":
            query["patient_id"] = current_user["id"]
        elif current_user["role"] == "doctor":
            query["doctor_id"] = current_user["id"]
        
        treatments = await db.treatments.find(query).sort("reminder_date", 1).to_list(50)
        
        result = []
        for treatment in treatments:
            result.append({
                "id": str(treatment["_id"]),
                "product_name": treatment.get("product_name"),
                "patient_id": treatment.get("patient_id"),
                "reminder_date": treatment.get("reminder_date"),
                "end_date": treatment.get("end_date"),
                "days_remaining": (treatment.get("end_date") - datetime.utcnow()).days if treatment.get("end_date") else None,
            })
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reminders: {str(e)}"
        )
