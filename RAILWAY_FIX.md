# Fix Railway "Railpack could not determine how to build"

## 🐛 Error

```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

## ✅ Solutions (Try in Order)

### **Solution 1: Set Root Directory in Railway Dashboard** ⭐ (Most Important)

1. **Go to Railway Dashboard**
2. **Select your service**
3. **Settings Tab** → **Root Directory**
4. **Set to**: `backend` (just the folder name, no slash)
5. **Save**
6. **Redeploy**

**This is the #1 cause of this error!**

---

### **Solution 2: Manual Configuration in Railway**

1. **Railway Dashboard** → Your Service → **Settings**
2. **Set these values**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. **Save and Redeploy**

---

### **Solution 3: Use Configuration Files**

I've created these files in `backend/`:

1. **`nixpacks.toml`** - Railway's native config
2. **`railway.json`** - Railway config
3. **`start.sh`** - Startup script
4. **`Procfile`** - Already exists

**Make sure Root Directory is set to `backend`** so Railway finds these files!

---

### **Solution 4: Create Service from Scratch**

If nothing works:

1. **Delete current service** in Railway
2. **New Project** → **Deploy from GitHub**
3. **Select repository**: `DermaSnap`
4. **When prompted**, set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. **Deploy**

---

## 📋 Step-by-Step Fix

### **Step 1: Verify Root Directory**

**Most Common Issue**: Root Directory is empty or wrong!

1. Railway Dashboard → Your Service
2. **Settings** tab
3. **Root Directory** field
4. Should be: `backend` (not empty, not `/backend`, not `./backend`)
5. **Save**

### **Step 2: Verify Files Exist**

Check these files exist in `backend/`:
- ✅ `Procfile`
- ✅ `requirements.txt`
- ✅ `server.py`
- ✅ `nixpacks.toml` (I created this)
- ✅ `railway.json` (I created this)
- ✅ `start.sh` (I created this)

### **Step 3: Set Environment Variables**

Railway Dashboard → **Variables** tab:
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
```

### **Step 4: Redeploy**

- Click **"Redeploy"** or push to GitHub (auto-deploy)

---

## 🔍 Troubleshooting

### **Still Getting Error?**

1. **Check Root Directory** - Must be `backend`
2. **Check Build Logs** - See what Railway is trying to do
3. **Try Manual Configuration** - Set build/start commands manually
4. **Delete and Recreate** - Sometimes fresh start helps

### **Build Logs Show "No files found"?**

- **Root Directory is wrong** - Set to `backend`

### **Build Logs Show "Python not found"?**

- Railway should auto-detect Python
- If not, `nixpacks.toml` specifies Python 3.11

---

## ✅ Expected Result

After fixing, Railway should:
1. ✅ Detect Python app
2. ✅ Install dependencies: `pip install -r requirements.txt`
3. ✅ Start app: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. ✅ App accessible at: `https://your-app.up.railway.app`

---

## 🎯 Quick Checklist

- [ ] Root Directory set to `backend` in Railway dashboard
- [ ] `Procfile` exists in `backend/` folder
- [ ] `nixpacks.toml` exists (I created it)
- [ ] `railway.json` exists (I created it)
- [ ] `start.sh` exists (I created it)
- [ ] Environment variables set
- [ ] Service redeployed

---

## 💡 Most Likely Fix

**90% of the time, the issue is Root Directory not set correctly!**

1. Railway Dashboard → Settings
2. **Root Directory**: `backend`
3. Save → Redeploy

**That's it!** 🚀

---

I've created:
- ✅ `backend/nixpacks.toml` - Railway build config
- ✅ `backend/start.sh` - Startup script
- ✅ `backend/railway.json` - Railway config

**Now set Root Directory to `backend` in Railway dashboard and redeploy!**
