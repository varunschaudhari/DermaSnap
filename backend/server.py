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
from yolo_service import get_yolo_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection with SSL/TLS support
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'dermasnap')

if not mongo_url:
    logger.warning("MONGO_URL not found in environment variables.")
    logger.warning("Using default MongoDB connection: mongodb://localhost:27017")
    logger.warning("To set custom MongoDB URL, add MONGO_URL to backend/.env file")
    mongo_url = "mongodb://localhost:27017"

# Configure MongoDB connection with SSL/TLS for Atlas
# MongoDB Atlas requires SSL, so we ensure it's enabled for mongodb+srv:// connections
connection_kwargs = {
    "serverSelectionTimeoutMS": 30000,  # 30 second timeout
    "connectTimeoutMS": 30000,
    "socketTimeoutMS": 30000,
    "retryWrites": True,
}

# For MongoDB Atlas (mongodb+srv://), SSL is required and enabled by default
# Motor automatically handles SSL for mongodb+srv:// connections
# DO NOT manually add tls=true - it causes SSL handshake errors
if mongo_url.startswith("mongodb+srv://"):
    # Remove any manual tls/ssl parameters that might conflict
    if "tls=true" in mongo_url:
        mongo_url = mongo_url.replace("&tls=true", "").replace("?tls=true", "").replace("tls=true&", "").replace("tls=true", "")
    if "ssl=true" in mongo_url:
        mongo_url = mongo_url.replace("&ssl=true", "").replace("?ssl=true", "").replace("ssl=true&", "").replace("ssl=true", "")
    if "tlsAllowInvalidCertificates" in mongo_url:
        # Remove tlsAllowInvalidCertificates parameter
        mongo_url = mongo_url.replace("&tlsAllowInvalidCertificates=false", "").replace("&tlsAllowInvalidCertificates=true", "")
        mongo_url = mongo_url.replace("?tlsAllowInvalidCertificates=false", "?").replace("?tlsAllowInvalidCertificates=true", "?")
        mongo_url = mongo_url.replace("tlsAllowInvalidCertificates=false&", "").replace("tlsAllowInvalidCertificates=true&", "")
    
    # Ensure connection string has proper format with required parameters
    if "?" not in mongo_url:
        mongo_url = f"{mongo_url}?retryWrites=true&w=majority"
    elif "retryWrites" not in mongo_url:
        mongo_url = f"{mongo_url}&retryWrites=true&w=majority"
    
    logger.info("Connecting to MongoDB Atlas with SSL/TLS (automatic)...")
else:
    logger.info("Connecting to local MongoDB...")

try:
    client = AsyncIOMotorClient(mongo_url, **connection_kwargs)
    db = client[db_name]
    # Test connection
    logger.info(f"✅ MongoDB client initialized for database: {db_name}")
except Exception as e:
    logger.error(f"❌ Failed to initialize MongoDB client: {e}")
    raise

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
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            scan_dict = scan.dict()
            # Store everything including imageBase64 in database
            # For production, consider using GridFS or cloud storage (S3) for large images
            # For now, base64 in MongoDB works for moderate image sizes
            
            result = await db.scans.insert_one(scan_dict)
            logger.info(f"Scan saved with ID: {result.inserted_id}")
            return {"id": str(result.inserted_id), "message": "Scan saved successfully"}
        except Exception as e:
            error_str = str(e)
            is_ssl_error = "SSL" in error_str or "TLS" in error_str or "handshake" in error_str.lower()
            
            if attempt < max_retries - 1 and is_ssl_error:
                logger.warning(f"SSL/TLS error on attempt {attempt + 1}/{max_retries}: {error_str}")
                logger.info(f"Retrying in {retry_delay} seconds...")
                import asyncio
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                logger.error(f"Error saving scan (attempt {attempt + 1}/{max_retries}): {e}", exc_info=True)
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

@api_router.post("/analyze/yolo")
async def analyze_with_yolo(data: Dict[str, Any]):
    """
    Detect acne lesions using YOLO model
    Accepts: { imageBase64: str, width: int, height: int, confidence?: float }
    Returns: { boxes: List[YOLOBox], model: str, count: int }
    """
    try:
        image_base64 = data.get("imageBase64")
        width = data.get("width", 800)
        height = data.get("height", 600)
        confidence = data.get("confidence", 0.3)
        
        if not image_base64:
            raise HTTPException(status_code=400, detail="imageBase64 is required")
        
        yolo_service = get_yolo_service()
        
        # Run YOLO detection
        result = yolo_service.detect_lesions(
            image_base64,
            width,
            height,
            confidence
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=503,
                detail=result.get("error", "YOLO detection failed")
            )
        
        return {
            "boxes": result.get("boxes", []),
            "model": result.get("model", "yolov8-nano"),
            "count": result.get("count", 0),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"YOLO detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"YOLO detection failed: {str(e)}")

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
    
    # Test MongoDB connection
    try:
        await client.admin.command('ping')
        logger.info("✅ MongoDB connection successful")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.error("⚠️  Database operations may fail. Check MONGO_URL and network connectivity.")
    
    logger.info("✅ Application started successfully")
    logger.info("ℹ️  Using YOLO + rule-based lesion analysis")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()