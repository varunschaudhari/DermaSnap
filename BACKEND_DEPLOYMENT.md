# Backend Deployment Guide

Complete step-by-step guide to deploy DermaSnap backend to production (free tier).

---

## 🎯 Recommended: Render (Free Tier)

**Why Render?**
- ✅ Free tier: 512MB RAM, 0.1 CPU
- ✅ Automatic HTTPS
- ✅ Easy FastAPI deployment
- ✅ Auto-deploy from GitHub
- ✅ Environment variable management
- ⚠️ **Note**: ML model (MedGemma ~8GB) won't fit on free tier, but app works with rule-based analysis

---

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **MongoDB Atlas Account** - Free tier available
3. **Render Account** - Free tier available
4. **Hugging Face Token** - For ML model (optional for free tier)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Set Up MongoDB Atlas (Free Database)**

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up for free account

2. **Create Free Cluster**
   - Click "Build a Database"
   - Choose **FREE (M0)** tier
   - Select region closest to you (e.g., `us-east-1`)
   - Click "Create"
   - Wait 3-5 minutes for cluster to be ready

3. **Create Database User**
   - Go to **Security → Database Access**
   - Click "Add New Database User"
   - Authentication Method: **Password**
   - Username: `dermasnap_user` (or your choice)
   - Password: Click "Autogenerate Secure Password" (SAVE THIS PASSWORD!)
   - Database User Privileges: **Read and write to any database**
   - Click "Add User"

4. **Whitelist IP Address**
   - Go to **Security → Network Access**
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - Click "Confirm"
   - ⚠️ **Note**: For production, restrict to Render's IP ranges

5. **Get Connection String**
   - Go back to **Database** tab
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: **Python**, Version: **3.6 or later**
   - Copy the connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **Replace** `<username>` with your database username
   - **Replace** `<password>` with your database password
   - **Add database name** at the end:
     ```
     mongodb+srv://dermasnap_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dermasnap?retryWrites=true&w=majority
     ```
   - **SAVE THIS CONNECTION STRING** - You'll need it in Step 3

---

### **Step 2: Prepare Your Code**

1. **Ensure Code is on GitHub**
   ```bash
   # If not already on GitHub
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Verify Deployment Files Exist**
   - ✅ `backend/Procfile` - Should contain: `web: uvicorn server:app --host 0.0.0.0 --port $PORT`
   - ✅ `backend/requirements.txt` - All dependencies listed
   - ✅ `backend/runtime.txt` - Python version (e.g., `python-3.11.0`)

---

### **Step 3: Deploy to Render**

1. **Create Render Account**
   - Go to [Render](https://render.com)
   - Click "Get Started for Free"
   - Sign up with GitHub (recommended)

2. **Create New Web Service**
   - Click "New +" button (top right)
   - Select "Web Service"
   - Connect your GitHub account if not already connected
   - Select your repository: `DermaSnap` (or your repo name)
   - Click "Connect"

3. **Configure Service**
   - **Name**: `dermasnap-backend` (or your choice)
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` ⚠️ **CRITICAL**: Set this to `backend`!
     - This tells Render to run commands from the `backend/` folder
     - Without this, Render will look for files in the repo root and fail
     - Only changes in `backend/` will trigger auto-deploy
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT` ⚠️ **IMPORTANT**
     - `uvicorn` = ASGI server for FastAPI
     - `server:app` = your `server.py` file and `app` variable
     - `--host 0.0.0.0` = accept connections from anywhere (required for Render)
     - `--port $PORT` = use Render's assigned port (don't hardcode!)
   - **Plan**: **Free** (or upgrade later)

4. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```
   MONGO_URL=mongodb+srv://dermasnap_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dermasnap?retryWrites=true&w=majority
   ```
   (Use the connection string from Step 1)

   ```
   DB_NAME=dermasnap
   ```

   ```
   HUGGING_FACE_HUB_TOKEN=your_token_here
   ```
   (Your Hugging Face token - optional for free tier)

   ⚠️ **DO NOT SET PORT** - Render sets this automatically

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deployment
   - Watch the build logs for any errors

6. **Get Your Backend URL**
   - Once deployed, you'll see: `https://dermasnap-backend.onrender.com`
   - Or check the service dashboard for the URL

---

### **Step 4: Test Deployment**

1. **Test Health Endpoint**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
   Should return:
   ```json
   {"status": "healthy", "service": "DermaSnap API"}
   ```

2. **Test Root Endpoint**
   ```bash
   curl https://your-backend.onrender.com/
   ```
   Should return:
   ```json
   {"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}
   ```

---

### **Step 5: Update Frontend**

Update your frontend to use the new backend URL:

1. **Edit `frontend/.env`**:
   ```env
   EXPO_PUBLIC_BACKEND_URL=https://dermasnap-backend.onrender.com
   ```

2. **Restart Expo**:
   ```bash
   cd frontend
   npx expo start --clear
   ```

---

## 🔧 Troubleshooting

### **Build Fails**

**Error**: `ModuleNotFoundError: No module named 'X'`
- **Fix**: Check `requirements.txt` includes all dependencies
- Verify Python version in `runtime.txt` matches your local version

**Error**: `Could not find a version that satisfies the requirement`
- **Fix**: Check package versions in `requirements.txt` are valid
- Remove version constraints if needed (e.g., `torch>=2.0.0` instead of `torch==2.0.0`)

### **Service Crashes**

**Error**: `KeyError: 'MONGO_URL'`
- **Fix**: Verify environment variable is set in Render dashboard
- Check variable name is exactly `MONGO_URL` (case-sensitive)

**Error**: `Connection refused` or MongoDB errors
- **Fix**: 
  - Verify MongoDB connection string is correct
  - Check IP whitelist in MongoDB Atlas (should include `0.0.0.0/0` for Render)
  - Verify database user has correct permissions

### **Slow Response Times**

- **Free tier limitations**: Free tier has limited CPU/RAM
- **Cold starts**: First request after inactivity may be slow (30-60s)
- **Solution**: Upgrade to paid tier ($7/month) for better performance

### **ML Model Not Loading**

- **Expected on free tier**: MedGemma (~8GB) won't fit in 512MB RAM
- **App still works**: Falls back to rule-based analysis
- **To enable ML**: Upgrade to paid tier (1GB+ RAM) or deploy ML separately

---

## 📊 Monitoring

### **View Logs**
- Go to Render dashboard → Your service → "Logs" tab
- Real-time logs for debugging

### **Check Metrics**
- Render dashboard shows:
  - CPU usage
  - Memory usage
  - Request count
  - Response times

---

## 🔄 Updating Deployment

### **Automatic Deploys**
- Render auto-deploys on every push to `main` branch
- Or manually trigger: Dashboard → "Manual Deploy"

### **Manual Deploy**
1. Push changes to GitHub
2. Render detects changes automatically
3. New deployment starts (check "Events" tab)

---

## 🎯 Alternative: Railway Deployment

If you prefer Railway:

1. **Sign up**: [Railway](https://railway.app) (GitHub login)
2. **New Project**: "Deploy from GitHub repo"
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**: Same as Render
5. **Deploy**: Railway provides URL automatically

**Railway Free Tier**: $5 credit/month (requires credit card, no charge on free tier)

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Database user created (password saved)
- [ ] IP whitelisted (0.0.0.0/0 for Render)
- [ ] Connection string ready
- [ ] Hugging Face token ready (optional)

During deployment:
- [ ] Render account created
- [ ] Repository connected
- [ ] Root directory set to `backend`
- [ ] Environment variables set
- [ ] Build successful
- [ ] Service running

After deployment:
- [ ] Health endpoint works
- [ ] Frontend updated with new URL
- [ ] Full flow tested (capture → analyze → save)

---

## 🚀 Quick Deploy (5 Minutes)

1. **MongoDB Atlas**: Create cluster → Get connection string
2. **Render**: New Web Service → Connect GitHub → Set root to `backend`
3. **Environment**: Set `MONGO_URL`, `DB_NAME`, `HUGGING_FACE_HUB_TOKEN`
4. **Deploy**: Click "Create Web Service"
5. **Update Frontend**: Change `EXPO_PUBLIC_BACKEND_URL` to Render URL

**Your backend is live!** 🎉

---

## 📝 Environment Variables Reference

```env
# Required
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
DB_NAME=dermasnap

# Optional (for ML model - won't work on free tier)
HUGGING_FACE_HUB_TOKEN=hf_xxx

# Auto-set by Render (don't set manually)
PORT=8001
```

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Check Logs**: Render dashboard → Logs tab
- **Test Endpoints**: Use `curl` or Postman

---

**Recommended**: Start with **Render free tier** → Test thoroughly → Upgrade if needed! 🚀
