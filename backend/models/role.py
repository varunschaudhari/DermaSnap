"""
Role models and schemas for CRUD permissions management.
"""
from pydantic import BaseModel, Field
from typing import Dict, Literal, Optional
from datetime import datetime

PermissionFlag = Literal[0, 1, True, False]

class CrudPermissions(BaseModel):
    read: PermissionFlag = 0
    create: PermissionFlag = 0
    update: PermissionFlag = 0
    delete: PermissionFlag = 0

class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    key: str = Field(..., min_length=2, max_length=50, pattern="^[a-z][a-z0-9_\\-]*$")
    # resource -> crud flags
    permissions: Dict[str, CrudPermissions] = {}

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    permissions: Optional[Dict[str, CrudPermissions]] = None

class RoleResponse(RoleBase):
    id: str
    created_at: datetime
    updated_at: datetime

