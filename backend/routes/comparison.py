"""
Before/After comparison routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from auth.dependencies import get_current_user
from server import db

router = APIRouter(prefix="/comparison", tags=["comparison"])

@router.get("/compare", response_model=Dict[str, Any])
async def compare_scans(
    scan_id_1: str = Query(..., description="First scan ID"),
    scan_id_2: str = Query(..., description="Second scan ID"),
    current_user: dict = Depends(get_current_user)
):
    """Compare two scans"""
    try:
        if not ObjectId.is_valid(scan_id_1) or not ObjectId.is_valid(scan_id_2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid scan ID"
            )
        
        scan1 = await db.scans.find_one({"_id": ObjectId(scan_id_1)})
        scan2 = await db.scans.find_one({"_id": ObjectId(scan_id_2)})
        
        if not scan1 or not scan2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both scans not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient":
            # Patients can only compare their own scans
            if scan1.get("user_id") != current_user["id"] or scan2.get("user_id") != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        # Compare metrics
        comparison = {
            "scan1": {
                "id": str(scan1["_id"]),
                "timestamp": scan1.get("timestamp"),
                "imageUri": scan1.get("imageUri"),
            },
            "scan2": {
                "id": str(scan2["_id"]),
                "timestamp": scan2.get("timestamp"),
                "imageUri": scan2.get("imageUri"),
            },
            "comparisons": {}
        }
        
        # Compare acne metrics
        if scan1.get("acne") and scan2.get("acne"):
            acne1 = scan1["acne"].get("metrics", {})
            acne2 = scan2["acne"].get("metrics", {})
            comparison["comparisons"]["acne"] = {
                "totalCount": {
                    "before": acne1.get("totalCount", 0),
                    "after": acne2.get("totalCount", 0),
                    "change": acne2.get("totalCount", 0) - acne1.get("totalCount", 0),
                    "changePercent": calculate_percent_change(acne1.get("totalCount", 0), acne2.get("totalCount", 0))
                },
                "severity": {
                    "before": scan1["acne"].get("severity"),
                    "after": scan2["acne"].get("severity")
                }
            }
        
        # Compare pigmentation metrics
        if scan1.get("pigmentation") and scan2.get("pigmentation"):
            pig1 = scan1["pigmentation"].get("metrics", {})
            pig2 = scan2["pigmentation"].get("metrics", {})
            comparison["comparisons"]["pigmentation"] = {
                "pigmentedPercent": {
                    "before": float(pig1.get("pigmentedPercent", "0").replace("%", "")) if isinstance(pig1.get("pigmentedPercent"), str) else pig1.get("pigmentedPercent", 0),
                    "after": float(pig2.get("pigmentedPercent", "0").replace("%", "")) if isinstance(pig2.get("pigmentedPercent"), str) else pig2.get("pigmentedPercent", 0),
                },
                "severity": {
                    "before": scan1["pigmentation"].get("severity"),
                    "after": scan2["pigmentation"].get("severity")
                }
            }
        
        # Compare wrinkles metrics
        if scan1.get("wrinkles") and scan2.get("wrinkles"):
            wr1 = scan1["wrinkles"].get("metrics", {})
            wr2 = scan2["wrinkles"].get("metrics", {})
            comparison["comparisons"]["wrinkles"] = {
                "count": {
                    "before": wr1.get("count", 0),
                    "after": wr2.get("count", 0),
                    "change": wr2.get("count", 0) - wr1.get("count", 0),
                    "changePercent": calculate_percent_change(wr1.get("count", 0), wr2.get("count", 0))
                },
                "severity": {
                    "before": scan1["wrinkles"].get("severity"),
                    "after": scan2["wrinkles"].get("severity")
                }
            }
        
        return comparison
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(e)}"
        )

def calculate_percent_change(before: float, after: float) -> float:
    """Calculate percentage change"""
    if before == 0:
        return 0.0 if after == 0 else 100.0
    return ((after - before) / before) * 100

@router.get("/{scan_id}/baseline", response_model=Dict[str, Any])
async def get_baseline_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get baseline scan for comparison"""
    try:
        if not ObjectId.is_valid(scan_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid scan ID"
            )
        
        scan = await db.scans.find_one({"_id": ObjectId(scan_id)})
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient" and scan.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Find baseline scan (first scan for this patient/analysis type)
        user_id = scan.get("user_id")
        analysis_type = scan.get("analysisType")
        
        if user_id:
            baseline = await db.scans.find_one(
                {
                    "user_id": user_id,
                    "analysisType": analysis_type
                },
                sort=[("timestamp", 1)]
            )
        else:
            baseline = scan
        
        if not baseline:
            baseline = scan
        
        return {
            "id": str(baseline["_id"]),
            "timestamp": baseline.get("timestamp"),
            "imageUri": baseline.get("imageUri"),
            "acne": baseline.get("acne"),
            "pigmentation": baseline.get("pigmentation"),
            "wrinkles": baseline.get("wrinkles"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get baseline: {str(e)}"
        )

@router.post("/set-baseline")
async def set_baseline_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Set a scan as baseline for comparison"""
    try:
        if not ObjectId.is_valid(scan_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid scan ID"
            )
        
        scan = await db.scans.find_one({"_id": ObjectId(scan_id)})
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found"
            )
        
        # Check permissions
        if current_user["role"] == "patient" and scan.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Mark as baseline
        await db.scans.update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"is_baseline": True, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Baseline scan set successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set baseline: {str(e)}"
        )
