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
from ml_service import get_medgemma_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'dermasnap')

if not mongo_url:
    logger.warning("MONGO_URL not found in environment variables.")
    logger.warning("Using default MongoDB connection: mongodb://localhost:27017")
    logger.warning("To set custom MongoDB URL, add MONGO_URL to backend/.env file")
    mongo_url = "mongodb://localhost:27017"

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

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
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}

@api_router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "DermaSnap API"}

@api_router.post("/scans", response_model=Dict[str, str])
async def create_scan(scan: ScanData):
    """
    Save a new skin scan analysis with image stored in database
    Images are stored as base64 in MongoDB (consider GridFS for production with large images)
    """
    try:
        scan_dict = scan.dict()
        # Store everything including imageBase64 in database
        # For production, consider using GridFS or cloud storage (S3) for large images
        # For now, base64 in MongoDB works for moderate image sizes
        
        result = await db.scans.insert_one(scan_dict)
        logger.info(f"Scan saved with ID: {result.inserted_id}")
        return {"id": str(result.inserted_id), "message": "Scan saved successfully"}
    except Exception as e:
        logger.error(f"Error saving scan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save scan: {str(e)}")

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

@api_router.post("/analyze/ml")
async def analyze_with_ml(data: Dict[str, Any]):
    """
    Analyze skin image using MedGemma ML model
    Accepts: { imageBase64: str, analysisType: str, timestamp?: str }
    """
    try:
        image_base64 = data.get("imageBase64")
        analysis_type = data.get("analysisType", "full")
        timestamp = data.get("timestamp", datetime.now().isoformat())
        
        if not image_base64:
            raise HTTPException(status_code=400, detail="imageBase64 is required")
        
        medgemma = get_medgemma_service()
        
        # Check if MedGemma is available
        if not medgemma.is_available():
            try:
                medgemma.load_model()
            except Exception as e:
                logging.warning(f"MedGemma not available, will use rule-based: {e}")
                raise HTTPException(
                    status_code=503,
                    detail="ML analysis not available. Please use rule-based analysis."
                )
        
        # Analyze with MedGemma
        result = medgemma.analyze_skin_image(
            image_base64,
            analysis_type
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "ML analysis failed")
            )
        
        return {
            "id": "ml_analysis",
            "ml_analysis": result.get("parsed", {}),
            "analysis": result.get("analysis", ""),
            "model": result.get("model", "medgemma-4b-it"),
            "confidence": result.get("confidence", "medium"),
            "method": result.get("method", "ml"),
            "timestamp": timestamp,
            "analysisType": analysis_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML analysis error: {e}", exc_info=True)
        # Provide more helpful error messages
        error_detail = str(e)
        if "timeout" in error_detail.lower() or "timed out" in error_detail.lower():
            error_detail = "ML analysis timed out. The model may be loading. Please try again in a moment."
        elif "cuda" in error_detail.lower() or "gpu" in error_detail.lower():
            error_detail = "GPU error. Falling back to CPU processing."
        elif "memory" in error_detail.lower() or "out of memory" in error_detail.lower():
            error_detail = "Insufficient memory for ML analysis. Try with a smaller image."
        
        raise HTTPException(
            status_code=500,
            detail=f"ML analysis failed: {error_detail}"
        )

@api_router.post("/extract-pixels")
async def extract_pixels(data: Dict[str, Any]):
    """
    Extract pixel data from base64 image for rule-based analysis
    Accepts: { imageBase64: str, width: int, height: int }
    Returns: { pixels: List[int] } - RGBA pixel array
    """
    try:
        from PIL import Image
        import base64
        from io import BytesIO
        import numpy as np
        
        image_base64 = data.get("imageBase64")
        width = data.get("width", 800)
        height = data.get("height", 600)
        
        if not image_base64:
            raise HTTPException(status_code=400, detail="imageBase64 is required")
        
        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        
        # Resize if needed
        if image.size != (width, height):
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        
        # Convert to numpy array and extract pixels
        img_array = np.array(image)
        pixels = img_array.flatten().tolist()
        
        # Convert to RGBA format (add alpha channel)
        rgba_pixels = []
        for i in range(0, len(pixels), 3):
            rgba_pixels.extend([pixels[i], pixels[i+1], pixels[i+2], 255])
        
        return {
            "pixels": rgba_pixels,
            "width": width,
            "height": height,
            "format": "RGBA"
        }
        
    except Exception as e:
        logger.error(f"Pixel extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pixel extraction failed: {str(e)}")

# Include the router in the main app (must be after all route definitions)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Application startup...")
    # NOTE: MedGemma pre-loading disabled for free tier (512MB RAM limit)
    # MedGemma model is ~8GB, too large for free tier
    # App will use rule-based analysis instead (works perfectly!)
    # ML model can be loaded on-demand if sufficient memory is available
    logger.info("✅ Application started successfully")
    logger.info("ℹ️  MedGemma ML model disabled (requires >512MB RAM)")
    logger.info("ℹ️  Using rule-based analysis (works great for free tier!)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()