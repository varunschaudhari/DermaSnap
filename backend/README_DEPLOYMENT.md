# Backend Deployment Files

## Files Created

1. **`Procfile`** - Tells Render how to run the app
2. **`runtime.txt`** - Specifies Python version
3. **`render.yaml`** - Render configuration (optional, can use UI instead)
4. **`.renderignore`** - Files to exclude from deployment

## Environment Variables Needed

Set these in Render dashboard:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=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
```

## Important Notes

- **PORT** is automatically set by Render (don't set manually)
- **ML Model**: MedGemma (~8GB) won't work on free tier (512MB RAM)
- App will gracefully fall back to rule-based analysis if ML unavailable
- First deployment takes 5-10 minutes

## Testing After Deployment

```bash
curl https://your-backend.onrender.com/api/health
# Should return: {"status": "healthy", "service": "DermaSnap API"}
```
