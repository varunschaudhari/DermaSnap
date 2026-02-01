# Railway Deployment Setup

## 🐛 Error Fix

**Error:**
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

**Solution:** Railway needs configuration to know how to build and run your app.

---

## ✅ Quick Fix

### **Option 1: Use Procfile (Recommended)**

Railway automatically detects `Procfile`. Your `backend/Procfile` should contain:

```
web: uvicorn server:app --host 0.0.0.0 --port $PORT
```

✅ **This should already exist!** Check if it's in the `backend/` folder.

### **Option 2: Use railway.json**

I've created `backend/railway.json` with the configuration. Railway will use this.

### **Option 3: Set in Railway Dashboard**

1. Go to Railway dashboard
2. Select your service
3. Go to **Settings** tab
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

---

## 📋 Complete Railway Setup

### **Step 1: Verify Files**

Make sure these files exist in `backend/`:
- ✅ `Procfile` (with `web: uvicorn server:app --host 0.0.0.0 --port $PORT`)
- ✅ `requirements.txt`
- ✅ `server.py`
- ✅ `railway.json` (optional, I've created it)

### **Step 2: Railway Configuration**

1. **Go to Railway Dashboard**
2. **Select your service**
3. **Settings Tab**:
   - **Root Directory**: `backend` ⚠️ **IMPORTANT!**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### **Step 3: Environment Variables**

Add in Railway dashboard → **Variables** tab:
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
```

### **Step 4: Deploy**

Railway will auto-deploy when you push to GitHub, or click **"Deploy"** manually.

---

## 🔧 Troubleshooting

### **Error: "Script start.sh not found"**

**Fix:** Set **Start Command** in Railway dashboard:
```
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### **Error: "Could not determine how to build"**

**Fix:** Set **Root Directory** to `backend` in Railway dashboard.

### **Error: "Module not found"**

**Fix:** Ensure **Root Directory** is set to `backend` so Railway finds `server.py`.

---

## ✅ Expected Result

After setup, Railway should:
1. ✅ Detect Python app
2. ✅ Install dependencies from `requirements.txt`
3. ✅ Start with `uvicorn server:app`
4. ✅ App accessible at `https://your-app.up.railway.app`

---

## 📝 Files Checklist

Make sure these exist in `backend/`:
- [ ] `Procfile` - Contains: `web: uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] `requirements.txt` - All dependencies
- [ ] `server.py` - Main app file
- [ ] `railway.json` - Optional (I've created it)

---

## 🎯 Quick Fix Steps

1. **Check Procfile exists**: `backend/Procfile`
2. **Set Root Directory**: Railway dashboard → Settings → `backend`
3. **Set Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. **Redeploy**: Railway will auto-detect and deploy

---

**After these steps, Railway should build and deploy successfully!** 🚀
