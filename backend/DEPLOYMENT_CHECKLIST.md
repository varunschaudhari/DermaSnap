# Backend Deployment Checklist

## ✅ Pre-Deployment Checklist

### Code Preparation
- [ ] Code is committed and pushed to GitHub
- [ ] `backend/Procfile` exists and is correct
- [ ] `backend/requirements.txt` has all dependencies
- [ ] `backend/runtime.txt` specifies Python version
- [ ] `backend/server.py` is the main entry point
- [ ] All environment variables are documented

### MongoDB Atlas Setup
- [ ] MongoDB Atlas account created
- [ ] Free cluster (M0) created and running
- [ ] Database user created (username + password saved)
- [ ] Network Access configured (0.0.0.0/0 for Render)
- [ ] Connection string ready:
  ```
  mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
  ```

### Render Account Setup
- [ ] Render account created (GitHub login)
- [ ] GitHub repository connected to Render
- [ ] Ready to create new Web Service

---

## 🚀 Deployment Steps

### Step 1: Create Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Select repository: `DermaSnap`
- [ ] Click "Connect"

### Step 2: Configure Service
- [ ] Name: `dermasnap-backend`
- [ ] Region: Selected
- [ ] Branch: `main` (or your default)
- [ ] **Root Directory**: `backend` ⚠️ CRITICAL
- [ ] Runtime: `Python 3`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] Plan: `Free`

### Step 3: Environment Variables
- [ ] `MONGO_URL` = MongoDB connection string
- [ ] `DB_NAME` = `dermasnap`
- [ ] `HUGGING_FACE_HUB_TOKEN` = Your HF token (optional)
- [ ] **DO NOT SET PORT** (auto-set by Render)

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Build started successfully
- [ ] Build completed without errors
- [ ] Service is running (green status)

---

## ✅ Post-Deployment Verification

### Health Check
- [ ] Health endpoint works:
  ```bash
  curl https://your-backend.onrender.com/api/health
  ```
  Returns: `{"status": "healthy", "service": "DermaSnap API"}`

### Root Endpoint
- [ ] Root endpoint works:
  ```bash
  curl https://your-backend.onrender.com/
  ```
  Returns: `{"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}`

### Frontend Integration
- [ ] Updated `frontend/.env` with new backend URL
- [ ] Frontend can connect to backend
- [ ] Test full flow: capture → analyze → save

---

## 🔧 Troubleshooting Checklist

### Build Fails
- [ ] Check build logs in Render dashboard
- [ ] Verify `requirements.txt` has correct packages
- [ ] Check Python version in `runtime.txt`
- [ ] Verify root directory is `backend`

### Service Crashes
- [ ] Check logs in Render dashboard
- [ ] Verify all environment variables are set
- [ ] Check MongoDB connection string is correct
- [ ] Verify MongoDB IP whitelist includes Render

### Connection Issues
- [ ] Verify MongoDB connection string format
- [ ] Check database user permissions
- [ ] Verify network access in MongoDB Atlas
- [ ] Test MongoDB connection from local machine

---

## 📝 Notes

- **First deployment**: Takes 5-10 minutes
- **Cold starts**: First request after inactivity may be slow (30-60s)
- **ML Model**: Won't work on free tier (512MB RAM), app uses rule-based fallback
- **Auto-deploy**: Render auto-deploys on every push to main branch

---

## 🎯 Your Backend URL

Once deployed, your backend will be available at:
```
https://dermasnap-backend.onrender.com
```

Update this in `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://dermasnap-backend.onrender.com
```

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete
