# Running DermaSnap locally

This guide covers the **FastAPI backend**, **Vite + React web dashboard**, and where to find the **Expo mobile** app. You need **MongoDB** running before the API will work fully.

## Prerequisites

- **Python** 3.10+ (3.11 matches deployment; see `backend/runtime.txt`)
- **Node.js** 18+
- **MongoDB** — local install, Docker, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Optional: **Expo CLI** — only if you run the mobile app in `frontend/`

## 1. MongoDB

Start a local server (example):

```bash
mongod
```

Or set `MONGO_URL` in `backend/.env` to an Atlas connection string. Defaults are `mongodb://localhost:27017` and database `dermasnap` if unset. See [backend/ENV_SETUP.md](backend/ENV_SETUP.md) for all variables.

## 2. Backend API

From the repository root:

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS / Linux:**

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (minimal local example):

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dermasnap
HUGGING_FACE_HUB_TOKEN=
```

`HUGGING_FACE_HUB_TOKEN` is optional for some ML features; the app can fall back when it is missing. More detail: [backend/ENV_SETUP.md](backend/ENV_SETUP.md).

Start the API (development, with auto-reload):

```bash
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

- API base: `http://localhost:8001`
- Health check: `GET http://localhost:8001/api/health`

Production-style (no reload):

```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

## 3. Web dashboard (`admin/`)

In a **second** terminal:

```bash
cd admin
npm install
```

Create `admin/.env` so the app talks to your API (defaults match local dev if omitted):

```env
VITE_BACKEND_URL=http://localhost:8001
```

Start Vite:

```bash
npm run dev
```

- UI: `http://localhost:3000` (see `admin/vite.config.ts`)
- Dev server proxies `/api` to `http://localhost:8001` for same-origin requests; many calls use `VITE_BACKEND_URL` directly.

### First-time login (seed users)

The dashboard does not register users in the UI by default. Seed accounts from the backend:

**Windows (PowerShell):**

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python .\scripts\seed_users.py
```

**macOS / Linux:**

```bash
cd backend
source .venv/bin/activate
python scripts/seed_users.py
```

Default credentials (change via env vars before seeding if needed — see `admin/README.md`):

- Admin: `admin@dermasnap.app` / `Admin@123`
- Doctor: `doctor@dermasnap.app` / `Doctor@123`

## 4. Mobile app (optional)

The Expo / React Native client lives under `frontend/`. Install dependencies and start Expo:

```bash
cd frontend
yarn install
yarn expo start
```

See the root [README.md](README.md) for feature overview and usage.

## 5. Production build (web only)

```bash
cd admin
npm run build
npm run preview
```

Serve the `dist/` output behind your HTTP server and point `VITE_BACKEND_URL` at your deployed API URL at build time.

## 6. Deploying the API

Render and related files are under `backend/`. See [backend/README_DEPLOYMENT.md](backend/README_DEPLOYMENT.md).

---

**Troubleshooting**

- **Connection refused to MongoDB:** ensure `mongod` is running or `MONGO_URL` is correct.
- **CORS / API URL issues:** set `VITE_BACKEND_URL` to the same host:port the browser should use for API calls.
- **Heavy ML dependencies:** first `pip install` can take a while; GPU/optional models may need extra setup beyond this guide.
