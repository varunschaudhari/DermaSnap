"""
Doctor-Patient relationship model and schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class RelationshipStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class RelationshipBase(BaseModel):
    doctor_id: str
    patient_id: str

class RelationshipCreate(BaseModel):
    doctor_id: Optional[str] = None
    invite_code: Optional[str] = None

class RelationshipResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    status: RelationshipStatus
    created_at: datetime
    updated_at: datetime

class InviteCodeResponse(BaseModel):
    invite_code: str
    expires_at: datetime
