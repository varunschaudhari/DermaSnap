# Quick Deployment Guide (5 Minutes)

## 🚀 Deploy to Render (Free Tier)

### **1. MongoDB Atlas Setup** (2 min)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free cluster (M0)
3. Create database user (save password!)
4. Network Access → Allow from anywhere (0.0.0.0/0)
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority`

### **2. Render Setup** (3 min)
1. Go to [Render](https://render.com) → Sign up with GitHub
2. New → Web Service → Connect GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Environment Variables:
   ```
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
   DB_NAME=dermasnap
   HUGGING_FACE_HUB_TOKEN=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
   ```
5. Deploy → Wait 5-10 min

### **3. Update Frontend**
Update `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://dermasnap-backend.onrender.com
```

**Done!** Your backend is live! 🎉

---

## ⚠️ Note: ML Model

MedGemma (~8GB) won't fit on free tier (512MB RAM).

**Options**:
- ✅ Use rule-based analysis (works great!)
- 💰 Upgrade to $7/month for ML model
- 🔄 Deploy ML separately on GPU service

---

**Test**: `https://your-backend.onrender.com/api/health` should return `{"status": "healthy"}`
