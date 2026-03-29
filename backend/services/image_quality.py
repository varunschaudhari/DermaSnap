"""
Image quality validation service
"""
import cv2
import numpy as np
from PIL import Image
from io import BytesIO
import base64
from typing import Dict, Any, Tuple

def decode_base64_image(image_base64: str) -> np.ndarray:
    """Decode base64 image to numpy array"""
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    
    image_data = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_data)).convert("RGB")
    return np.array(image)

def calculate_focus_score(image: np.ndarray) -> Tuple[float, str]:
    """
    Calculate focus score using Laplacian variance
    Returns: (score, status)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Thresholds (adjust based on testing)
    if laplacian_var > 500:
        status = "excellent"
    elif laplacian_var > 200:
        status = "good"
    elif laplacian_var > 100:
        status = "fair"
    else:
        status = "poor"
    
    # Normalize score to 0-100
    score = min(100, max(0, (laplacian_var / 500) * 100))
    
    return score, status

def calculate_lighting_score(image: np.ndarray) -> Tuple[float, str]:
    """
    Calculate lighting quality (brightness and contrast)
    Returns: (score, status)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # Calculate brightness (mean intensity)
    brightness = np.mean(gray)
    
    # Calculate contrast (standard deviation)
    contrast = np.std(gray)
    
    # Ideal brightness: 100-180 (out of 255)
    brightness_score = 100
    if 100 <= brightness <= 180:
        brightness_score = 100
    elif brightness < 100:
        brightness_score = (brightness / 100) * 100
    else:
        brightness_score = ((255 - brightness) / 75) * 100
    
    # Ideal contrast: > 30
    contrast_score = min(100, (contrast / 50) * 100)
    
    # Combined score
    score = (brightness_score * 0.6 + contrast_score * 0.4)
    
    if score >= 80:
        status = "excellent"
    elif score >= 60:
        status = "good"
    elif score >= 40:
        status = "fair"
    else:
        status = "poor"
    
    return score, status

def estimate_distance(image: np.ndarray) -> Tuple[float, str]:
    """
    Estimate distance using face detection (simplified)
    Returns: (score, status)
    """
    # For now, use image size as proxy
    # In production, use face detection to estimate distance
    height, width = image.shape[:2]
    
    # Ideal image size for dermatoscope: 800x600 to 1920x1080
    pixel_count = width * height
    
    if pixel_count >= 800 * 600:
        score = 100
        status = "good"
    elif pixel_count >= 400 * 300:
        score = 70
        status = "fair"
    else:
        score = 40
        status = "poor"
    
    return score, status

def validate_resolution(image: np.ndarray) -> Tuple[float, str]:
    """
    Validate image resolution
    Returns: (score, status)
    """
    height, width = image.shape[:2]
    
    # Minimum resolution: 640x480
    if width >= 1920 and height >= 1080:
        score = 100
        status = "excellent"
    elif width >= 1280 and height >= 720:
        score = 90
        status = "good"
    elif width >= 800 and height >= 600:
        score = 75
        status = "fair"
    elif width >= 640 and height >= 480:
        score = 50
        status = "minimum"
    else:
        score = 0
        status = "poor"
    
    return score, status

def validate_image_quality(image_base64: str) -> Dict[str, Any]:
    """
    Comprehensive image quality validation
    Returns quality scores and recommendations
    """
    try:
        image = decode_base64_image(image_base64)
        
        # Calculate individual scores
        focus_score, focus_status = calculate_focus_score(image)
        lighting_score, lighting_status = calculate_lighting_score(image)
        distance_score, distance_status = estimate_distance(image)
        resolution_score, resolution_status = validate_resolution(image)
        
        # Overall quality score (weighted average)
        overall_score = (
            focus_score * 0.35 +
            lighting_score * 0.30 +
            distance_score * 0.20 +
            resolution_score * 0.15
        )
        
        # Determine overall status
        if overall_score >= 80:
            overall_status = "excellent"
            is_acceptable = True
        elif overall_score >= 60:
            overall_status = "good"
            is_acceptable = True
        elif overall_score >= 40:
            overall_status = "fair"
            is_acceptable = True
        else:
            overall_status = "poor"
            is_acceptable = False
        
        # Generate recommendations
        recommendations = []
        if focus_status == "poor":
            recommendations.append("Image is out of focus. Please retake with better focus.")
        if lighting_status == "poor":
            recommendations.append("Lighting is insufficient. Please use better lighting.")
        if distance_status == "poor":
            recommendations.append("Image is too far or too close. Maintain proper distance.")
        if resolution_status == "poor":
            recommendations.append("Image resolution is too low. Please use higher resolution.")
        
        return {
            "overall_score": round(overall_score, 2),
            "overall_status": overall_status,
            "is_acceptable": is_acceptable,
            "metrics": {
                "focus": {
                    "score": round(focus_score, 2),
                    "status": focus_status
                },
                "lighting": {
                    "score": round(lighting_score, 2),
                    "status": lighting_status
                },
                "distance": {
                    "score": round(distance_score, 2),
                    "status": distance_status
                },
                "resolution": {
                    "score": round(resolution_score, 2),
                    "status": resolution_status
                }
            },
            "recommendations": recommendations
        }
    except Exception as e:
        return {
            "overall_score": 0,
            "overall_status": "error",
            "is_acceptable": False,
            "error": str(e),
            "recommendations": ["Failed to validate image. Please retake."]
        }
