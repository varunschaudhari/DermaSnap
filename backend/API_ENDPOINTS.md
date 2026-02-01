# API Endpoints Reference

## Base URL
- Local: `http://localhost:8001`
- Production: Set via `EXPO_PUBLIC_BACKEND_URL` in frontend `.env`

## Available Endpoints

### Root & Health
- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/` - API root (same as `/api/health`)

### ML Analysis
- `POST /api/analyze/ml` - Analyze image with MedGemma ML model
  - **Request Body:**
    ```json
    {
      "imageBase64": "base64_encoded_image_string",
      "analysisType": "acne" | "pigmentation" | "wrinkles" | "full",
      "timestamp": "2024-01-01T00:00:00.000Z" (optional)
    }
    ```
  - **Response:**
    ```json
    {
      "id": "ml_analysis",
      "ml_analysis": {
        "acne": { "severity": "mild|moderate|severe", ... },
        "pigmentation": { "severity": "...", ... },
        "wrinkles": { "severity": "...", ... }
      },
      "analysis": "raw text analysis",
      "model": "medgemma-4b-it",
      "confidence": "high|medium|low",
      "method": "ml",
      "timestamp": "...",
      "analysisType": "..."
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

# ML Analysis (example)
curl -X POST http://localhost:8001/api/analyze/ml \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "base64_string", "analysisType": "full"}'
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
- MedGemma model not loaded
- Check if model downloaded successfully
