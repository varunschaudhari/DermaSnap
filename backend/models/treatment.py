"""
Treatment model and schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TreatmentStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TreatmentBase(BaseModel):
    product_name: str
    frequency: str  # e.g., "Once Daily", "Twice Daily"
    duration_days: int = Field(..., gt=0)
    notes: Optional[str] = None
    diagnosis: Optional[str] = None

class TreatmentCreate(TreatmentBase):
    patient_id: str
    doctor_id: Optional[str] = None
    start_date: Optional[datetime] = None
    reminder_days_before: int = Field(default=3, ge=0, le=30)

class TreatmentUpdate(BaseModel):
    product_name: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    status: Optional[TreatmentStatus] = None

class TreatmentResponse(TreatmentBase):
    id: str
    patient_id: str
    doctor_id: Optional[str] = None
    status: TreatmentStatus
    start_date: datetime
    end_date: datetime
    reminder_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class TreatmentReminder(BaseModel):
    treatment_id: str
    patient_id: str
    reminder_date: datetime
    message: str
    sent: bool = False
