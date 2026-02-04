"""
YOLO Service for Acne Lesion Detection
Supports YOLOv8-nano and YOLOv11-nano models for real-time detection
"""

import logging
from typing import Dict, Any, List, Optional
import base64
from io import BytesIO
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


class YOLOService:
    """Service for detecting acne lesions using YOLO models"""
    
    def __init__(self):
        self.model = None
        self.model_name = None
        self.loaded = False
        # Model paths (would be in assets/models/ or downloaded on first use)
        self.model_paths = {
            'yolov8-nano': 'models/yolov8n-acne.pt',  # PyTorch format
            'yolov11-nano': 'models/yolov11n-acne.pt',
            'yolov8-tflite': 'models/yolov8n-acne.tflite',  # TensorFlow Lite for mobile
        }
    
    def load_model(self, model_name: str = 'yolov8-nano'):
        """
        Load YOLO model
        For production: Download from HuggingFace or use pre-trained weights
        """
        try:
            # Try to import ultralytics (YOLOv8/v11)
            try:
                from ultralytics import YOLO
            except ImportError:
                logger.warning("ultralytics not installed. Install with: pip install ultralytics")
                return False
            
            model_path = self.model_paths.get(model_name, self.model_paths['yolov8-nano'])
            
            # Check if model file exists, if not, download or use default
            import os
            if not os.path.exists(model_path):
                logger.warning(f"Model {model_path} not found. Using pretrained YOLOv8-nano.")
                # Use pretrained COCO weights as fallback (can fine-tune later)
                model_path = 'yolov8n.pt'  # Will download automatically
            
            self.model = YOLO(model_path)
            self.model_name = model_name
            self.loaded = True
            logger.info(f"✅ YOLO model loaded: {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.loaded = False
            return False
    
    def is_available(self) -> bool:
        """Check if YOLO model is available"""
        return self.loaded and self.model is not None
    
    def detect_lesions(
        self,
        image_base64: str,
        width: int,
        height: int,
        confidence_threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Detect acne lesions in image using YOLO
        
        Args:
            image_base64: Base64 encoded image
            width: Image width
            height: Image height
            confidence_threshold: Minimum confidence (0-1)
        
        Returns:
            Dictionary with detection results
        """
        if not self.is_available():
            # Try to load model if not loaded
            if not self.load_model():
                return {
                    "success": False,
                    "error": "YOLO model not available. Install ultralytics: pip install ultralytics",
                    "boxes": []
                }
        
        try:
            # Decode base64 image
            base64_data = image_base64
            if "," in image_base64:
                base64_data = image_base64.split(",")[-1]
            
            image_data = base64.b64decode(base64_data)
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Resize if needed (YOLO works best with specific sizes, but handles any)
            # YOLOv8/v11 can handle variable input sizes
            
            # Run YOLO inference
            results = self.model(image, conf=confidence_threshold, verbose=False)
            
            # Parse results
            boxes = []
            for result in results:
                # result.boxes contains: xyxy (coordinates), conf (confidence), cls (class)
                if result.boxes is not None and len(result.boxes) > 0:
                    for i in range(len(result.boxes)):
                        box = result.boxes[i]
                        
                        # Get coordinates (xyxy format: x1, y1, x2, y2)
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Convert to center format (x, y, width, height)
                        center_x = (x1 + x2) / 2
                        center_y = (y1 + y2) / 2
                        box_width = x2 - x1
                        box_height = y2 - y1
                        
                        boxes.append({
                            "x": float(center_x),
                            "y": float(center_y),
                            "width": float(box_width),
                            "height": float(box_height),
                            "confidence": confidence,
                            "classId": class_id,
                            "class": self._map_class_id(class_id),
                        })
            
            return {
                "success": True,
                "boxes": boxes,
                "model": self.model_name or "yolov8-nano",
                "count": len(boxes),
            }
            
        except Exception as e:
            logger.error(f"YOLO detection failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "boxes": []
            }
    
    def _map_class_id(self, class_id: int) -> str:
        """
        Map YOLO class ID to lesion type
        Adjust based on your trained model's classes
        """
        # Default mapping (adjust based on your training data)
        class_map = {
            0: "comedone",
            1: "papule",
            2: "pustule",
            3: "nodule",
            4: "inflammatory",
            5: "non-inflammatory",
        }
        return class_map.get(class_id, "inflammatory")


# Global service instance
_yolo_service: Optional[YOLOService] = None


def get_yolo_service() -> YOLOService:
    """Get or create YOLO service instance"""
    global _yolo_service
    if _yolo_service is None:
        _yolo_service = YOLOService()
    return _yolo_service
