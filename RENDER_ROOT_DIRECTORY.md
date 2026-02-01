# Render Root Directory Setting - Critical!

## ⚠️ Why Root Directory is Important

Since your repository structure is:
```
DermaSnap/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── Procfile
│   └── ...
├── frontend/
│   └── ...
└── README.md
```

**You MUST set Root Directory to `backend`** in Render!

---

## 🎯 What Root Directory Does

According to Render's documentation:
> "If set, Render runs commands from this directory instead of the repository root. Additionally, code changes outside of this directory do not trigger an auto-deploy."

### What This Means:

1. **Commands run from `backend/` folder**
   - `pip install -r requirements.txt` looks for `backend/requirements.txt`
   - `uvicorn server:app` looks for `backend/server.py`
   - Without Root Directory set, these commands fail!

2. **Auto-deploy only for `backend/` changes**
   - Changes in `frontend/` won't trigger backend redeploy
   - Only changes in `backend/` trigger redeploy
   - This is perfect for monorepos!

---

## ✅ Correct Configuration

### In Render Dashboard:

**Root Directory**: `backend`

**NOT**:
- ❌ Empty (leaves blank)
- ❌ `/backend`
- ❌ `./backend`
- ❌ `backend/`

**YES**:
- ✅ `backend` (just the folder name)

---

## 🔍 How to Verify

After setting Root Directory to `backend`, Render will:

1. **Build logs show**:
   ```
   Running: pip install -r requirements.txt
   ```
   This runs from `backend/` directory

2. **Start command runs**:
   ```
   Running: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
   This finds `backend/server.py`

3. **If Root Directory is wrong**, you'll see errors like:
   ```
   ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
   ```
   or
   ```
   ERROR: Could not find module 'server'
   ```

---

## 📝 Step-by-Step in Render

1. **Create New Web Service**
2. **Connect Repository**
3. **In Configuration Section**, find:
   ```
   Root Directory [Optional]
   ```
4. **Type**: `backend`
5. **Continue with other settings**
6. **Deploy**

---

## ✅ Quick Checklist

- [ ] Root Directory is set to: `backend`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] All commands will run from `backend/` folder

---

## 🚨 Common Mistakes

### Mistake 1: Leaving Root Directory Empty
- **Result**: Render looks in repo root
- **Error**: Can't find `server.py`, `requirements.txt`
- **Fix**: Set to `backend`

### Mistake 2: Using Wrong Path
- ❌ `/backend` (absolute path - wrong)
- ❌ `./backend` (relative path - wrong)
- ✅ `backend` (just folder name - correct)

### Mistake 3: Typo
- ❌ `Backend` (capital B - case sensitive!)
- ❌ `backend/` (trailing slash - wrong)
- ✅ `backend` (lowercase, no slash - correct)

---

## 🎯 Summary

**Always set Root Directory to `backend`** when deploying from a monorepo structure!

This ensures:
- ✅ Commands run from correct directory
- ✅ Files are found correctly
- ✅ Auto-deploy works properly
- ✅ No deployment failures

---

**Your deployment will fail without this setting!** ⚠️
