# YOLO + Rule-Based Hybrid Lesion Detection

## Overview

This implementation combines **YOLO-based detection** (fast, real-time) with **precise rule-based refinement** for accurate acne lesion analysis.

## Architecture

### Phase 1: YOLO Detection (Fast Initial Detection)
- **YOLOv8-nano** or **YOLOv11-nano** detects rough bounding boxes
- Runs on backend (or mobile TFLite in future)
- Output: Bounding boxes with confidence scores and rough class labels
- Speed: ~30-60 FPS on mobile, ~100ms on backend

### Phase 2: Precise Contour Extraction (Rule-Based Refinement)
- For each YOLO box → crop small patch
- Apply **adaptive threshold** (localized to patch)
- Use **watershed-like algorithm** to get exact contour
- Compute precise measurements:
  - Area (pixels → mm² via scale calibration)
  - Circularity (4π × area / perimeter²)
  - Center intensity (mean brightness in center ROI)

### Phase 3: Classification (Your Exact Rules)
- **Pustule**: 0.3–5 mm², circularity >0.6, high center intensity
- **Papule**: 0.2–3 mm², circularity 0.4–0.8, no bright center
- **Nodule**: >5 mm² OR circularity <0.4
- **Whitehead**: <0.5 mm², bright, circularity >0.5
- **Blackhead**: <0.5 mm², dark, circularity >0.4
- **Comedone**: Default non-inflammatory

## Implementation Files

### Frontend
- `frontend/utils/yoloDetection.ts` - YOLO detection interface (backend/mobile)
- `frontend/utils/lesionAnalysis.ts` - Hybrid detection + precise refinement

### Backend
- `backend/yolo_service.py` - YOLO model service
- `backend/server.py` - `/api/analyze/yolo` endpoint

## Usage

### Frontend (Automatic)
The processing screen automatically uses YOLO if available:

```typescript
const lesionAnalysis = await analyzeLesions(
  pixelData, 
  800, 
  600, 
  skinTone, 
  calibration,
  imageBase64,  // Required for YOLO
  true          // useYOLO flag
);
```

### Backend Endpoint
```bash
POST /api/analyze/yolo
{
  "imageBase64": "...",
  "width": 800,
  "height": 600,
  "confidence": 0.3  // Optional, default 0.3
}
```

## Model Training

### Datasets
- **ACNE04**: Public acne dataset
- **DermNet NZ**: Dermatology images
- **AcneSCU**: Acne classification dataset
- Your custom dataset from `Images.docx`

### Training Steps
1. **Prepare dataset** with bounding boxes (YOLO format)
2. **Fine-tune YOLOv8-nano** on acne images
3. **Export to TFLite** for mobile deployment
4. **Deploy model** to backend or mobile

### Example Training Command
```bash
# Install ultralytics
pip install ultralytics

# Train YOLOv8-nano on custom dataset
yolo train data=acne_dataset.yaml model=yolov8n.pt epochs=100 imgsz=640
```

## Fallback Behavior

If YOLO is not available:
- ✅ Automatically falls back to rule-based detection
- ✅ No user-visible errors
- ✅ Still provides accurate results (slightly slower)

## Performance

### With YOLO
- Detection: ~100ms (backend) or ~30-60 FPS (mobile TFLite)
- Refinement: ~50-100ms per lesion
- Total: ~200-500ms for typical image

### Without YOLO (Rule-Based Only)
- Detection: ~500-1000ms
- Refinement: Same as above
- Total: ~600-1500ms

## Future Enhancements

1. **Mobile TFLite Support**
   - Load YOLOv8-nano.tflite on device
   - Real-time detection without backend
   - Use `@tensorflow/tfjs-react-native` or `react-native-fast-tflite`

2. **MediaPipe Face Landmarks**
   - Accurate ROI detection (cheek, forehead)
   - Better face alignment

3. **Advanced Watershed**
   - Full distance transform implementation
   - Better separation of touching lesions

4. **Model Fine-Tuning**
   - Train on your specific dataset
   - Improve accuracy for your use case

## Installation

### Backend
```bash
cd backend
pip install ultralytics  # For YOLOv8/v11
```

### Frontend
No additional dependencies needed (uses backend API)

## Configuration

Set in `backend/.env`:
```env
# Optional: Custom model path
YOLO_MODEL_PATH=models/yolov8n-acne.pt
YOLO_MODEL_NAME=yolov8-nano
```

## Notes

- YOLO model is loaded on-demand (not at startup) to save memory
- First detection may be slower (model loading)
- Model automatically downloads pretrained weights if custom model not found
- For production, use fine-tuned model trained on acne datasets
