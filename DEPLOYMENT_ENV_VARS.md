# Environment Variables for Deployment

## ✅ Your MongoDB Connection String

Your MongoDB connection string is ready! Use this in Render:

```
MONGO_URL=mongodb+srv://varunchaudhari12_db_user:En77F8N1jgHQI18f@dermasnap.wpk4t5k.mongodb.net/dermasnap?retryWrites=true&w=majority
```

**Note**: I've added `/dermasnap` (database name) and `?retryWrites=true&w=majority` (connection options) to your connection string.

---

## 🔧 Render Environment Variables

When deploying to Render, set these environment variables:

### Required Variables

1. **MONGO_URL**
   ```
   mongodb+srv://varunchaudhari12_db_user:En77F8N1jgHQI18f@dermasnap.wpk4t5k.mongodb.net/dermasnap?retryWrites=true&w=majority
   ```

2. **DB_NAME**
   ```
   dermasnap
   ```

### Optional Variables

3. **HUGGING_FACE_HUB_TOKEN** (for ML model - won't work on free tier)
   ```
   your_token_here
   ```

### Auto-Set by Render (Don't Set Manually)

- **PORT** - Automatically set by Render

---

## 📝 How to Set in Render

1. Go to your Render dashboard
2. Select your service: `dermasnap-backend`
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable:
   - **Key**: `MONGO_URL`
   - **Value**: `mongodb+srv://varunchaudhari12_db_user:En77F8N1jgHQI18f@dermasnap.wpk4t5k.mongodb.net/dermasnap?retryWrites=true&w=majority`
6. Repeat for `DB_NAME` and `HUGGING_FACE_HUB_TOKEN`
7. Click **Save Changes**
8. Service will automatically redeploy

---

## ✅ Verify Connection

After deployment, test the connection:

```bash
curl https://your-backend.onrender.com/api/health
```

Should return:
```json
{"status": "healthy", "service": "DermaSnap API"}
```

---

## 🔒 Security Notes

⚠️ **Important**: 
- Your MongoDB password is visible in this file
- **DO NOT** commit `.env` files to GitHub
- The `.env.example` file is safe (no real passwords)
- Render environment variables are encrypted

---

## 🚀 Quick Deploy Steps

1. **Render Dashboard** → Your Service → **Environment**
2. **Add Environment Variable**:
   - `MONGO_URL` = `mongodb+srv://varunchaudhari12_db_user:En77F8N1jgHQI18f@dermasnap.wpk4t5k.mongodb.net/dermasnap?retryWrites=true&w=majority`
   - `DB_NAME` = `dermasnap`
   - `HUGGING_FACE_HUB_TOKEN` = `your_token_here`
3. **Save** → Service redeploys automatically
4. **Test**: `curl https://your-backend.onrender.com/api/health`

---

**Your MongoDB is ready!** 🎉
