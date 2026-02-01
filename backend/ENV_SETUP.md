# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=dermasnap

# Hugging Face Token for MedGemma
HUGGING_FACE_HUB_TOKEN=your_token_here
```

## Quick Setup

### Option 1: Local MongoDB (Default)

If you have MongoDB running locally, the server will use defaults:
- `MONGO_URL`: `mongodb://localhost:27017` (default)
- `DB_NAME`: `dermasnap` (default)

You can start the server without creating `.env` file, but you'll need `HUGGING_FACE_HUB_TOKEN` for ML features.

### Option 2: MongoDB Atlas (Cloud)

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
```

## Creating .env File

### Windows PowerShell:
```powershell
cd backend
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
"@ | Out-File -FilePath .env -Encoding utf8
```

### Linux/Mac:
```bash
cd backend
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
EOF
```

## Verify Setup

After creating `.env`, start the server:
```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

The server should start without errors.
