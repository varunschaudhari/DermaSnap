from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import base64
from uuid import uuid4
from yolo_service import get_yolo_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", ROOT_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
for upload_type in ("acne", "wrinkles", "pimple"):
    (UPLOAD_DIR / upload_type).mkdir(parents=True, exist_ok=True)

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
# On Render, we may need explicit SSL configuration in client kwargs
if mongo_url.startswith("mongodb+srv://"):
    # Remove any manual tls/ssl parameters from URL that might conflict
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
    
    # For mongodb+srv://, Motor handles SSL automatically
    # Don't add explicit TLS config as it can conflict with automatic handling
    # Log the connection string (without password) for debugging
    safe_url = mongo_url.split("@")[-1] if "@" in mongo_url else mongo_url
    logger.info(f"Connecting to MongoDB Atlas: ...@{safe_url}")
    logger.info("Using automatic SSL/TLS (mongodb+srv://)...")
else:
    logger.info("Connecting to local MongoDB...")

try:
    
    client = AsyncIOMotorClient(mongo_url, **connection_kwargs)
    db = client[db_name]
    logger.info(f"✅ MongoDB client initialized for database: {db_name}")
except Exception as e:
    error_msg = str(e)
    logger.error(f"❌ Failed to initialize MongoDB client: {error_msg}")
    
    # Provide helpful debugging information
    if "SSL" in error_msg or "TLS" in error_msg or "handshake" in error_msg:
        logger.error("⚠️  SSL/TLS handshake error detected.")
        logger.error("💡 Troubleshooting steps:")
        logger.error("   1. Verify MONGO_URL format: mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority")
        logger.error("   2. Check MongoDB Atlas Network Access allows 0.0.0.0/0 (or Render IPs)")
        logger.error("   3. Verify database user credentials are correct")
        logger.error("   4. Ensure password is URL-encoded if it contains special characters")
    
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


def _resolve_storage_type(analysis_type: str) -> str:
    """
    Normalize analysis type for on-disk storage folders.
    User requirement:
    - keep categories like acne, wrinkles, pimple
    - remove full scan
    """
    normalized = (analysis_type or "").strip().lower()
    if normalized == "full":
        raise HTTPException(status_code=400, detail="Full scan is no longer supported")
    if normalized == "pigmentation":
        return "pimple"
    if normalized in {"acne", "wrinkles", "pimple"}:
        return normalized
    return "acne"


def _decode_base64_image(image_base64: str) -> bytes:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    return base64.b64decode(image_base64)


def _get_image_extension(image_base64: str) -> str:
    if image_base64.startswith("data:image/png"):
        return ".png"
    if image_base64.startswith("data:image/webp"):
        return ".webp"
    return ".jpg"


def _save_image_to_disk(image_base64: str, storage_type: str) -> Dict[str, str]:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    extension = _get_image_extension(image_base64)
    filename = f"{timestamp}_{uuid4().hex}{extension}"
    target_dir = UPLOAD_DIR / storage_type
    target_dir.mkdir(parents=True, exist_ok=True)
    image_path = target_dir / filename
    image_path.write_bytes(_decode_base64_image(image_base64))
    relative_path = image_path.relative_to(ROOT_DIR).as_posix()
    return {
        "imagePath": str(image_path),
        "imageUrl": f"/{relative_path}",
    }

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
    Save a new skin scan analysis.
    Image is stored on local disk by scan type; Mongo stores metadata and image path.
    """
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            scan_dict = scan.dict()
            storage_type = _resolve_storage_type(scan_dict.get("analysisType", ""))
            image_meta = _save_image_to_disk(scan_dict["imageBase64"], storage_type)
            scan_dict["analysisType"] = storage_type
            scan_dict["imageUri"] = image_meta["imageUrl"]
            scan_dict["imagePath"] = image_meta["imagePath"]
            # Keep DB lean by removing raw base64 payload
            scan_dict.pop("imageBase64", None)
            
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
        
        existing_scan = await db.scans.find_one({"_id": ObjectId(scan_id)})
        if not existing_scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        image_path = existing_scan.get("imagePath")
        if image_path:
            try:
                image_file = Path(image_path)
                if image_file.exists():
                    image_file.unlink()
            except Exception as file_error:
                logger.warning(f"Failed to delete image file for scan {scan_id}: {file_error}")

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
        pimple_count = await db.scans.count_documents({"analysisType": "pimple"})
        
        return {
            "totalScans": total_scans,
            "byType": {
                "acne": acne_count,
                "pigmentation": pigmentation_count,
                "pimple": pimple_count,
                "wrinkles": wrinkles_count,
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
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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