"""
Treatment suggestions routes
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.treatment_suggestions import get_treatment_suggestions

router = APIRouter(prefix="/treatment-suggestions", tags=["treatment-suggestions"])

@router.get("/suggest", response_model=Dict[str, Any])
async def get_suggestions(severity: str, analysis_type: str):
    """Get treatment suggestions based on severity and analysis type"""
    try:
        suggestions = get_treatment_suggestions(severity.lower(), analysis_type.lower())
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")
