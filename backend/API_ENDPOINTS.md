# API Endpoints Reference

## Base URL
- Local: `http://localhost:8001`
- Production: Set via `EXPO_PUBLIC_BACKEND_URL` in frontend `.env`

## Available Endpoints

### Root & Health
- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/` - API root (same as `/api/health`)

### YOLO Detection
- `POST /api/analyze/yolo` - Detect acne lesions using YOLO model
  - **Request Body:**
    ```json
    {
      "imageBase64": "base64_encoded_image_string",
      "width": 800,
      "height": 600,
      "confidence": 0.3 (optional, default 0.3)
    }
    ```
  - **Response:**
    ```json
    {
      "boxes": [
        {
          "x": 100.5,
          "y": 200.3,
          "width": 50.2,
          "height": 45.8,
          "confidence": 0.85,
          "classId": 1,
          "class": "papule"
        }
      ],
      "model": "yolov8-nano",
      "count": 5
    }
    ```

### Scans (History)
- `POST /api/scans` - Save a scan
- `GET /api/scans` - Get all scans (with pagination: `?limit=50&skip=0`)
- `GET /api/scans/{scan_id}` - Get specific scan
- `DELETE /api/scans/{scan_id}` - Delete a scan
- `GET /api/scans/stats/summary` - Get scan statistics

## Testing Endpoints

### Using curl:
```bash
# Health check
curl http://localhost:8001/api/health

# Root
curl http://localhost:8001/

# YOLO Detection (example)
curl -X POST http://localhost:8001/api/analyze/yolo \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "base64_string", "width": 800, "height": 600}'
```

### Using Browser:
- API Docs: http://localhost:8001/docs
- Health: http://localhost:8001/api/health
- Root: http://localhost:8001/

## Common Errors

### `{"detail":"Not Found"}`
- Check the URL path (should start with `/api/` for most endpoints)
- Verify the server is running
- Check if endpoint exists in `/docs`

### `422 Unprocessable Entity`
- Check request body format matches the endpoint requirements
- Verify required fields are present

### `503 Service Unavailable`
- YOLO model not available
- Check if ultralytics package is installed
- Verify model can be loaded (will auto-download on first use)
