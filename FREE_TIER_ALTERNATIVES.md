# Free Tier Deployment Alternatives

Complete guide to free tier platforms for deploying DermaSnap backend.

---

## 🎯 Best Free Tier Options

### **1. Railway** ⭐ (Recommended Alternative)

**Free Tier:**
- ✅ $5 credit/month (free, no charge)
- ✅ 512MB RAM, 1GB storage
- ✅ Automatic HTTPS
- ✅ Easy GitHub integration
- ✅ Good for Python/FastAPI

**Pros:**
- ✅ More generous than Render
- ✅ Better documentation
- ✅ Easy MongoDB integration
- ✅ Simple deployment

**Cons:**
- ⚠️ Requires credit card (no charge on free tier)
- ⚠️ Still won't fit MedGemma (~8GB)

**Deployment:**
```bash
# Similar to Render
- Connect GitHub repo
- Root Directory: backend
- Build: pip install -r requirements.txt
- Start: uvicorn server:app --host 0.0.0.0 --port $PORT
```

**URL:** https://railway.app

---

### **2. Fly.io**

**Free Tier:**
- ✅ 3 shared VMs
- ✅ 3GB persistent storage
- ✅ 160GB outbound data transfer
- ✅ Global deployment

**Pros:**
- ✅ Good for containers
- ✅ Global edge locations
- ✅ Generous free tier
- ✅ No credit card required

**Cons:**
- ⚠️ More complex setup (Docker)
- ⚠️ Requires Dockerfile

**Setup:**
```dockerfile
# Dockerfile needed
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

**URL:** https://fly.io

---

### **3. PythonAnywhere**

**Free Tier:**
- ✅ 512MB disk space
- ✅ 1 web app
- ✅ MySQL database included
- ✅ Python 3.8/3.9/3.10

**Pros:**
- ✅ Python-focused
- ✅ Built-in database
- ✅ Simple setup

**Cons:**
- ⚠️ Limited to Python
- ⚠️ No MongoDB (use MySQL instead)
- ⚠️ Less flexible

**URL:** https://www.pythonanywhere.com

---

### **4. Google Cloud Run** (Free Tier)

**Free Tier:**
- ✅ 2 million requests/month
- ✅ 360,000 GB-seconds compute
- ✅ 180,000 vCPU-seconds
- ✅ 1GB egress/month

**Pros:**
- ✅ Serverless (pay per use)
- ✅ Auto-scaling
- ✅ Generous free tier
- ✅ Google infrastructure

**Cons:**
- ⚠️ Requires Google Cloud account
- ⚠️ More complex setup
- ⚠️ Need Dockerfile

**URL:** https://cloud.google.com/run

---

### **5. Vercel** (Serverless)

**Free Tier:**
- ✅ 100GB bandwidth
- ✅ Serverless functions
- ✅ Automatic HTTPS
- ✅ Great for Next.js

**Pros:**
- ✅ Excellent for frontend
- ✅ Fast CDN
- ✅ Easy deployment

**Cons:**
- ⚠️ Better for serverless (not long-running)
- ⚠️ Function timeout limits
- ⚠️ Not ideal for FastAPI

**URL:** https://vercel.com

---

### **6. Heroku** (Limited Free Tier)

**Free Tier:**
- ❌ **No longer available** (discontinued Nov 2022)
- Was: 550-1000 dyno hours/month

**Note:** Heroku removed free tier, but Eco dyno is $5/month.

---

### **7. DigitalOcean App Platform**

**Free Tier:**
- ✅ $200 credit for 60 days (trial)
- ✅ Then paid plans start at $5/month

**Pros:**
- ✅ Good documentation
- ✅ Easy deployment

**Cons:**
- ⚠️ Not truly free (trial only)

**URL:** https://www.digitalocean.com/products/app-platform

---

### **8. AWS Free Tier**

**Free Tier:**
- ✅ EC2: 750 hours/month (t1.micro)
- ✅ Lambda: 1M requests/month
- ✅ RDS: 750 hours/month
- ✅ 12 months free (new accounts)

**Pros:**
- ✅ Very powerful
- ✅ Many services
- ✅ Industry standard

**Cons:**
- ⚠️ Complex setup
- ⚠️ Can get expensive if not careful
- ⚠️ Steep learning curve

**URL:** https://aws.amazon.com/free

---

### **9. Azure Free Tier**

**Free Tier:**
- ✅ $200 credit for 30 days
- ✅ 12 months free services
- ✅ Always free services

**Pros:**
- ✅ Good for Microsoft ecosystem
- ✅ Many services

**Cons:**
- ⚠️ Complex setup
- ⚠️ Can be confusing

**URL:** https://azure.microsoft.com/free

---

## 🏆 Comparison Table

| Platform | Free Tier | RAM | Setup | Best For |
|----------|-----------|-----|-------|----------|
| **Render** | 512MB | 512MB | Easy | FastAPI, Simple |
| **Railway** | $5 credit | 512MB | Easy | FastAPI, MongoDB |
| **Fly.io** | 3 VMs | Shared | Medium | Docker, Global |
| **PythonAnywhere** | 512MB disk | Limited | Easy | Python only |
| **Cloud Run** | 2M requests | Auto | Hard | Serverless |
| **Vercel** | 100GB | Serverless | Easy | Frontend/Next.js |
| **AWS** | 12 months | Varies | Hard | Enterprise |
| **Azure** | 30 days | Varies | Hard | Enterprise |

---

## 🎯 Recommendations

### **For Your Use Case (FastAPI + MongoDB):**

1. **Railway** ⭐ (Best alternative to Render)
   - Similar to Render
   - $5 credit/month
   - Easy MongoDB integration
   - Better than Render free tier

2. **Fly.io** (If you can use Docker)
   - More generous free tier
   - Global deployment
   - Good for production

3. **Stay with Render** (If you fix memory issue)
   - Already set up
   - Just need to disable ML model
   - Works fine for rule-based analysis

---

## 📋 Quick Setup: Railway

### Step 1: Create Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Deploy
1. **New Project** → **Deploy from GitHub repo**
2. Select your `DermaSnap` repository
3. **Add Service** → **GitHub Repo**
4. **Settings**:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Step 3: Environment Variables
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dermasnap?retryWrites=true&w=majority
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=your_token_here
```

### Step 4: Deploy
- Railway auto-deploys
- Get public URL automatically

---

## 📋 Quick Setup: Fly.io

### Step 1: Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Create Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 3: Deploy
```bash
fly launch
fly deploy
```

---

## ⚠️ Important Notes

### **ML Model Limitations:**
- **None of these free tiers** can run MedGemma (~8GB)
- **All platforms** will work with rule-based analysis
- **To use ML**: Upgrade to paid tier or use GPU service

### **MongoDB:**
- **MongoDB Atlas** free tier works with all platforms
- **No need to change** database setup

---

## 🎯 My Recommendation

**For now:**
1. ✅ **Fix Render deployment** (disable ML model)
2. ✅ **Use rule-based analysis** (works great!)
3. ✅ **Free tier is sufficient** for your needs

**If Render doesn't work:**
1. ✅ **Try Railway** (easiest alternative)
2. ✅ **Similar setup** to Render
3. ✅ **Better free tier** ($5 credit/month)

---

## 📝 Summary

**Best Free Tier Options:**
1. **Railway** - $5 credit/month, easy setup
2. **Fly.io** - 3 VMs, more generous
3. **Render** - 512MB, already set up (just fix memory issue)

**All work with:**
- ✅ FastAPI
- ✅ MongoDB Atlas
- ✅ Rule-based analysis
- ❌ MedGemma ML model (needs >512MB RAM)

---

**Recommendation: Fix Render first, then try Railway if needed!** 🚀
