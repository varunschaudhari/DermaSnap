from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models for skin analysis data
class SkinMetrics(BaseModel):
    totalCount: Optional[int] = None
    comedones: Optional[int] = None
    pustules: Optional[int] = None
    papules: Optional[int] = None
    nodules: Optional[int] = None
    inflammatoryPercent: Optional[int] = None
    density: Optional[str] = None
    rednessPercent: Optional[int] = None
    poreCount: Optional[int] = None
    avgPoreSize: Optional[int] = None
    poreDensity: Optional[str] = None
    pigmentedPercent: Optional[str] = None
    avgIntensityDiff: Optional[int] = None
    shi: Optional[str] = None
    spotCount: Optional[int] = None
    spotDensity: Optional[str] = None
    count: Optional[int] = None
    countPerCm: Optional[str] = None
    avgLength: Optional[int] = None
    avgDepth: Optional[int] = None
    densityPercent: Optional[str] = None

class AnalysisResult(BaseModel):
    metrics: SkinMetrics
    severity: str
    lesions: Optional[List[Dict[str, Any]]] = None
    regions: Optional[List[Dict[str, Any]]] = None
    lines: Optional[List[Dict[str, Any]]] = None

class SkinTone(BaseModel):
    r: int
    g: int
    b: int

class ScanData(BaseModel):
    imageUri: str
    imageBase64: str
    skinTone: SkinTone
    timestamp: str
    analysisType: str
    acne: Optional[AnalysisResult] = None
    pigmentation: Optional[AnalysisResult] = None
    wrinkles: Optional[AnalysisResult] = None

class ScanResponse(BaseModel):
    id: str
    imageUri: str
    skinTone: SkinTone
    timestamp: str
    analysisType: str
    acne: Optional[Dict[str, Any]] = None
    pigmentation: Optional[Dict[str, Any]] = None
    wrinkles: Optional[Dict[str, Any]] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "SkinQuant AI API", "version": "1.0.0"}

@api_router.post("/scans", response_model=Dict[str, str])
async def create_scan(scan: ScanData):
    """
    Save a new skin scan analysis
    """
    try:
        scan_dict = scan.dict()
        # Remove base64 image before storing (to save space - optional)
        scan_dict_to_store = scan_dict.copy()
        # Keep imageBase64 if you want full data backup
        
        result = await db.scans.insert_one(scan_dict_to_store)
        return {"id": str(result.inserted_id), "message": "Scan saved successfully"}
    except Exception as e:
        logging.error(f"Error saving scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to save scan")

@api_router.get("/scans", response_model=List[Dict[str, Any]])
async def get_scans(limit: int = 50, skip: int = 0):
    """
    Retrieve all scans with pagination
    """
    try:
        scans = await db.scans.find().sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        # Convert ObjectId to string for JSON serialization
        for scan in scans:
            scan['_id'] = str(scan['_id'])
        return scans
    except Exception as e:
        logging.error(f"Error retrieving scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve scans")

@api_router.get("/scans/{scan_id}", response_model=Dict[str, Any])
async def get_scan(scan_id: str):
    """
    Retrieve a specific scan by ID
    """
    try:
        if not ObjectId.is_valid(scan_id):
            raise HTTPException(status_code=400, detail="Invalid scan ID")
        
        scan = await db.scans.find_one({"_id": ObjectId(scan_id)})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        scan['_id'] = str(scan['_id'])
        return scan
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error retrieving scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve scan")

@api_router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str):
    """
    Delete a scan by ID
    """
    try:
        if not ObjectId.is_valid(scan_id):
            raise HTTPException(status_code=400, detail="Invalid scan ID")
        
        result = await db.scans.delete_one({"_id": ObjectId(scan_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        return {"message": "Scan deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete scan")

@api_router.get("/scans/stats/summary")
async def get_scan_statistics():
    """
    Get summary statistics of all scans
    """
    try:
        total_scans = await db.scans.count_documents({})
        
        # Count by analysis type
        acne_count = await db.scans.count_documents({"analysisType": "acne"})
        pigmentation_count = await db.scans.count_documents({"analysisType": "pigmentation"})
        wrinkles_count = await db.scans.count_documents({"analysisType": "wrinkles"})
        full_count = await db.scans.count_documents({"analysisType": "full"})
        
        return {
            "totalScans": total_scans,
            "byType": {
                "acne": acne_count,
                "pigmentation": pigmentation_count,
                "wrinkles": wrinkles_count,
                "full": full_count,
            }
        }
    except Exception as e:
        logging.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()