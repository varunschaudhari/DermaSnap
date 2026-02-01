"""
MedGemma ML Service for Skin Analysis
Handles loading and using Google's MedGemma model for dermatology image analysis
"""

from transformers import AutoProcessor, AutoModelForImageTextToText
from PIL import Image
import torch
import base64
from io import BytesIO
import logging
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


class MedGemmaService:
    """Service for analyzing skin images using MedGemma model"""
    
    def __init__(self):
        self.model_id = "google/medgemma-4b-it"
        self.model = None
        self.processor = None
        self.loaded = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_model(self):
        """Load MedGemma model (call once on startup)"""
        if self.loaded:
            logger.info("MedGemma model already loaded")
            return
        
        try:
            logger.info(f"Loading MedGemma model on {self.device}...")
            
            # Get Hugging Face token from environment
            hf_token = os.environ.get('HUGGING_FACE_HUB_TOKEN') or os.environ.get('HF_TOKEN')
            if hf_token:
                logger.info("Using Hugging Face token from environment")
            else:
                logger.warning("No Hugging Face token found. Make sure HUGGING_FACE_HUB_TOKEN is set in .env")
            
            # Load model with appropriate dtype
            torch_dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            
            # Load model with retry and better error handling
            try:
                self.model = AutoModelForImageTextToText.from_pretrained(
                    self.model_id,
                    dtype=torch_dtype,  # Use dtype instead of torch_dtype (newer API)
                    device_map="auto" if self.device == "cuda" else None,
                    token=hf_token,
                    trust_remote_code=False,
                )
                
                if self.device == "cpu" and self.model.device.type != "cpu":
                    self.model = self.model.to(self.device)
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                # Try without device_map for CPU
                if self.device == "cpu":
                    logger.info("Retrying without device_map for CPU...")
                    self.model = AutoModelForImageTextToText.from_pretrained(
                        self.model_id,
                        dtype=torch_dtype,
                        token=hf_token,
                        trust_remote_code=False,
                    )
                    self.model = self.model.to("cpu")
                else:
                    raise
            
            # Load processor
            self.processor = AutoProcessor.from_pretrained(
                self.model_id,
                token=hf_token
            )
            self.loaded = True
            logger.info("✅ MedGemma model loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load MedGemma model: {e}")
            logger.error("Make sure you have requested access on Hugging Face")
            raise
    
    def is_available(self) -> bool:
        """Check if MedGemma is available and loaded"""
        return self.loaded and self.model is not None and self.processor is not None
    
    def analyze_skin_image(
        self, 
        image_base64: str, 
        analysis_type: str = "full"
    ) -> Dict[str, Any]:
        """
        Analyze skin image using MedGemma
        
        Args:
            image_base64: Base64 encoded image (with or without data URL prefix)
            analysis_type: Type of analysis - 'acne', 'pigmentation', 'wrinkles', or 'full'
        
        Returns:
            Dictionary with analysis results
        """
        if not self.loaded:
            try:
                self.load_model()
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                return {
                    "success": False,
                    "error": "MedGemma model not available",
                    "fallback": True
                }
        
        try:
            # Clean base64 string (remove data URL prefix if present)
            base64_data = image_base64
            if "," in image_base64:
                base64_data = image_base64.split(",")[-1]
            
            # Decode base64 image
            image_data = base64.b64decode(base64_data)
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Create prompt based on analysis type
            prompts = {
                "acne": (
                    "Analyze this skin image specifically for acne. "
                    "Identify and count all types of lesions: comedones (blackheads/whiteheads), "
                    "pustules (with pus), papules (without pus), and nodules (large/deep). "
                    "Provide: 1) Total lesion count, 2) Count by type, 3) Lesion density per cm², "
                    "4) Inflammatory percentage, 5) Redness index, 6) Pore count and density, "
                    "7) Overall severity (Mild/Moderate/Severe). "
                    "Format your response as structured data with exact numbers."
                ),
                "pigmentation": (
                    "Analyze this skin image specifically for pigmentation issues. "
                    "Identify dark spots, hyperpigmentation, and uneven skin tone. "
                    "Provide: 1) Pigmented area percentage, 2) Average intensity difference, "
                    "3) Skin Hyperpigmentation Index (SHI), 4) Spot count, 5) Spot density per cm², "
                    "6) Overall severity (Mild/Moderate/Severe). "
                    "Format your response as structured data with exact numbers."
                ),
                "wrinkles": (
                    "Analyze this skin image specifically for wrinkles and fine lines. "
                    "Identify all visible lines and measure their characteristics. "
                    "Provide: 1) Total wrinkle count, 2) Wrinkles per cm², "
                    "3) Average length in mm, 4) Average depth (intensity), "
                    "5) Density percentage, 6) Overall severity (Mild/Moderate/Severe). "
                    "Format your response as structured data with exact numbers."
                ),
                "full": (
                    "Perform a comprehensive skin analysis covering acne, pigmentation, and wrinkles. "
                    "For ACNE: Provide total lesion count, count by type (comedones, pustules, papules, nodules), "
                    "lesion density per cm², inflammatory percentage, redness index, pore count and density, "
                    "and severity (Mild/Moderate/Severe). "
                    "For PIGMENTATION: Provide pigmented area percentage, average intensity difference, "
                    "SHI score, spot count, spot density, and severity. "
                    "For WRINKLES: Provide total count, count per cm², average length, average depth, "
                    "density percentage, and severity. "
                    "Format your response as structured JSON-like data with exact numbers for each condition."
                )
            }
            
            prompt = prompts.get(analysis_type, prompts["full"])
            
            # Prepare messages for MedGemma
            messages = [
                {
                    "role": "system",
                    "content": [{
                        "type": "text", 
                        "text": (
                            "You are an expert dermatologist. Provide detailed, quantitative analysis "
                            "of skin conditions. Always provide exact numbers and metrics when possible. "
                            "Use structured format with clear labels for each metric."
                        )
                    }]
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image", "image": image}
                    ]
                }
            ]
            
            # Process and generate
            inputs = self.processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt"
            ).to(self.model.device, dtype=torch.bfloat16 if self.device == "cuda" else torch.float32)
            
            input_len = inputs["input_ids"].shape[-1]
            
            # Generate response
            with torch.inference_mode():
                generation = self.model.generate(
                    **inputs,
                    max_new_tokens=500,
                    do_sample=False,
                    temperature=0.1  # Lower temperature for more consistent results
                )
                generation = generation[0][input_len:]
            
            decoded = self.processor.decode(generation, skip_special_tokens=True)
            
            # Parse the response to extract structured data
            parsed_data = self._parse_medgemma_response(decoded, analysis_type)
            
            return {
                "success": True,
                "analysis": decoded,
                "parsed": parsed_data,
                "model": "medgemma-4b-it",
                "confidence": "high",
                "method": "ml"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image with MedGemma: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback": True
            }
    
    def _parse_medgemma_response(self, text: str, analysis_type: str) -> Dict[str, Any]:
        """
        Parse MedGemma's text response to extract structured metrics
        This is a basic parser - you may need to improve it based on actual outputs
        """
        parsed = {}
        text_lower = text.lower()
        
        try:
            if analysis_type == "acne" or analysis_type == "full":
                # Try to extract acne metrics
                acne_data = {}
                
                # Extract counts
                import re
                total_match = re.search(r'total.*?(\d+).*?lesion', text_lower)
                if total_match:
                    acne_data["totalCount"] = int(total_match.group(1))
                
                # Extract severity
                if "severe" in text_lower:
                    acne_data["severity"] = "Severe"
                elif "moderate" in text_lower:
                    acne_data["severity"] = "Moderate"
                else:
                    acne_data["severity"] = "Mild"
                
                parsed["acne"] = acne_data
            
            if analysis_type == "pigmentation" or analysis_type == "full":
                pigmentation_data = {}
                
                # Extract percentage
                percent_match = re.search(r'(\d+\.?\d*)\s*%', text_lower)
                if percent_match:
                    pigmentation_data["pigmentedPercent"] = float(percent_match.group(1))
                
                # Extract severity
                if "severe" in text_lower:
                    pigmentation_data["severity"] = "Severe"
                elif "moderate" in text_lower:
                    pigmentation_data["severity"] = "Moderate"
                else:
                    pigmentation_data["severity"] = "Mild"
                
                parsed["pigmentation"] = pigmentation_data
            
            if analysis_type == "wrinkles" or analysis_type == "full":
                wrinkles_data = {}
                
                # Extract count
                count_match = re.search(r'(\d+).*?wrinkle', text_lower)
                if count_match:
                    wrinkles_data["count"] = int(count_match.group(1))
                
                # Extract severity
                if "severe" in text_lower:
                    wrinkles_data["severity"] = "Severe"
                elif "moderate" in text_lower:
                    wrinkles_data["severity"] = "Moderate"
                else:
                    wrinkles_data["severity"] = "Mild"
                
                parsed["wrinkles"] = wrinkles_data
                
        except Exception as e:
            logger.warning(f"Error parsing MedGemma response: {e}")
        
        return parsed


# Global instance (singleton pattern)
_medgemma_service: Optional[MedGemmaService] = None


def get_medgemma_service() -> MedGemmaService:
    """Get or create MedGemma service instance"""
    global _medgemma_service
    if _medgemma_service is None:
        _medgemma_service = MedGemmaService()
    return _medgemma_service
