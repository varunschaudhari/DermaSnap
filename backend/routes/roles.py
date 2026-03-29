"""
Admin Roles CRUD routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from auth.dependencies import get_current_admin
from server import db
from models.role import RoleCreate, RoleUpdate

router = APIRouter(prefix="/admin/roles", tags=["admin-roles"])

def _serialize_role(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "key": doc.get("key"),
        "permissions": doc.get("permissions", {}),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }

def _normalize_perms(perms: Dict[str, Any] | None) -> Dict[str, Dict[str, int]]:
    """
    Convert Pydantic CrudPermissions models to plain dicts for MongoDB.
    Ensures values are JSON-serializable ints (0/1).
    """
    if not perms:
        return {}
    norm: Dict[str, Dict[str, int]] = {}
    for k, v in perms.items():
        if isinstance(v, BaseModel):
            data = v.model_dump()
        elif hasattr(v, "dict"):  # legacy pydantic v1
            data = v.dict()
        else:
            data = dict(v)
        # coerce to ints
        norm[k] = {
            "read": int(bool(data.get("read", 0))),
            "create": int(bool(data.get("create", 0))),
            "update": int(bool(data.get("update", 0))),
            "delete": int(bool(data.get("delete", 0))),
        }
    return norm

@router.get("", response_model=List[Dict[str, Any]])
async def list_roles(current_user: dict = Depends(get_current_admin)):
    roles = await db.roles.find().sort("created_at", -1).to_list(200)
    return [_serialize_role(r) for r in roles]

@router.post("", response_model=Dict[str, Any], status_code=201)
async def create_role(payload: RoleCreate, current_user: dict = Depends(get_current_admin)):
    existing = await db.roles.find_one({"$or": [{"key": payload.key}, {"name": payload.name}]})
    if existing:
        raise HTTPException(status_code=400, detail="Role with same name or key already exists")
    now = datetime.utcnow()
    doc = {
        "name": payload.name,
        "key": payload.key,
        "permissions": _normalize_perms(payload.permissions),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.roles.insert_one(doc)
    created = await db.roles.find_one({"_id": result.inserted_id})
    return _serialize_role(created)

@router.put("/{role_id}", response_model=Dict[str, Any])
async def update_role(role_id: str, payload: RoleUpdate, current_user: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(role_id):
        raise HTTPException(status_code=400, detail="Invalid role id")
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.permissions is not None:
        updates["permissions"] = _normalize_perms(payload.permissions)
    if not updates:
        return _serialize_role(await db.roles.find_one({"_id": ObjectId(role_id)}))
    updates["updated_at"] = datetime.utcnow()
    await db.roles.update_one({"_id": ObjectId(role_id)}, {"$set": updates})
    updated = await db.roles.find_one({"_id": ObjectId(role_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return _serialize_role(updated)

@router.delete("/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(role_id):
        raise HTTPException(status_code=400, detail="Invalid role id")
    result = await db.roles.delete_one({"_id": ObjectId(role_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted"}

