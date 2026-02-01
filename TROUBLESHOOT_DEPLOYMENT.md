# Troubleshoot Deployment: "Not Found" Error

## 🐛 Problem

Accessing `https://dermasnap.onrender.com/` returns:
```json
{"detail":"Not Found"}
```

## 🔍 Possible Causes

### 1. **Router Not Included** (Most Likely)

The `api_router` must be included **before** middleware. Check `server.py`:

```python
# Router must be included
app.include_router(api_router)

# Then middleware
app.add_middleware(CORSMiddleware, ...)
```

### 2. **App Not Starting**

Check Render logs to see if the app started successfully.

### 3. **Wrong URL**

Try these endpoints:
- Root: `https://dermasnap.onrender.com/`
- Health: `https://dermasnap.onrender.com/api/health`

---

## ✅ Quick Fixes

### **Fix 1: Check Render Logs**

1. Go to Render dashboard
2. Select your service: `dermasnap`
3. Click **"Logs"** tab
4. Look for:
   - ✅ `Application startup complete`
   - ✅ `Uvicorn running on http://0.0.0.0:PORT`
   - ❌ Any errors or exceptions

### **Fix 2: Verify Router is Included**

In `backend/server.py`, ensure this line exists **after all route definitions**:

```python
# Include the router in the main app (must be after all route definitions)
app.include_router(api_router)
```

### **Fix 3: Test Different Endpoints**

Try these URLs:

1. **Root endpoint**:
   ```
   https://dermasnap.onrender.com/
   ```
   Should return: `{"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}`

2. **Health endpoint**:
   ```
   https://dermasnap.onrender.com/api/health
   ```
   Should return: `{"status": "healthy", "service": "DermaSnap API"}`

3. **API docs** (if enabled):
   ```
   https://dermasnap.onrender.com/docs
   ```

---

## 🔧 Common Issues & Solutions

### **Issue 1: Router Not Included**

**Symptom**: All endpoints return `{"detail":"Not Found"}`

**Solution**: Ensure `app.include_router(api_router)` is in `server.py` **after** all route definitions.

### **Issue 2: App Crashed on Startup**

**Symptom**: Service shows "Unavailable" or keeps restarting

**Solution**: 
1. Check Render logs for errors
2. Common causes:
   - Missing environment variables (MONGO_URL)
   - Import errors
   - Port binding issues

### **Issue 3: Wrong Service URL**

**Symptom**: Getting 404 or connection refused

**Solution**: 
- Check Render dashboard for correct URL
- Should be: `https://dermasnap.onrender.com` (or your service name)

---

## 📋 Diagnostic Steps

### Step 1: Check Service Status

In Render dashboard:
- Service should show **"Live"** (green)
- Not "Unavailable" or "Building"

### Step 2: Check Logs

Look for these in logs:
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:PORT
```

If you see errors, that's the problem!

### Step 3: Test Endpoints

```bash
# Test root
curl https://dermasnap.onrender.com/

# Test health
curl https://dermasnap.onrender.com/api/health
```

### Step 4: Verify Code

Check `backend/server.py` has:
```python
@app.get("/")
async def root():
    return {"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}

# ... all routes ...

app.include_router(api_router)  # ← Must be here!
```

---

## 🎯 Most Likely Fix

**Check Render logs first!** The logs will tell you exactly what's wrong.

Common issues:
1. **App crashed** → Check logs for error messages
2. **Router not included** → Add `app.include_router(api_router)`
3. **Import error** → Check all imports are correct
4. **Environment variable missing** → Set MONGO_URL in Render

---

## ✅ Expected Behavior

When working correctly:

1. **Root endpoint** (`/`):
   ```json
   {"message": "DermaSnap API", "version": "1.0.0", "status": "healthy"}
   ```

2. **Health endpoint** (`/api/health`):
   ```json
   {"status": "healthy", "service": "DermaSnap API"}
   ```

3. **Service status**: Green "Live" in Render dashboard

---

**Next Step**: Check Render logs to see what's actually happening! 🔍
