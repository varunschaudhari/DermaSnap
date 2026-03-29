"""
Image quality validation routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.image_quality import validate_image_quality

router = APIRouter(prefix="/image", tags=["image-quality"])

class ImageQualityRequest(BaseModel):
    imageBase64: str

@router.post("/validate-quality", response_model=Dict[str, Any])
async def validate_quality(request: ImageQualityRequest):
    """Validate image quality"""
    try:
        result = validate_image_quality(request.imageBase64)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality validation failed: {str(e)}")
