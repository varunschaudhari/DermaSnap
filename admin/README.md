# DermaSnap Web Dashboard

Web dashboard for doctors and admins to manage patients, view scans, and create treatment plans.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```
VITE_BACKEND_URL=http://localhost:8001
```

4. Start development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## Seed Users (for first login)

The web dashboard has no self-registration page, so create users from backend first:

```powershell
cd ..\backend
python .\scripts\seed_users.py
```

Default seeded credentials:

- Admin: `admin@dermasnap.app` / `Admin@123`
- Doctor: `doctor@dermasnap.app` / `Doctor@123`

You can override these with env vars before running seed:

```powershell
$env:SEED_ADMIN_EMAIL="admin@example.com"
$env:SEED_ADMIN_PASSWORD="StrongAdminPass123"
$env:SEED_DOCTOR_EMAIL="doctor@example.com"
$env:SEED_DOCTOR_PASSWORD="StrongDoctorPass123"
python .\scripts\seed_users.py
```

## Features

- Doctor Dashboard: View patients, scans, and create treatment plans
- Admin Dashboard: System management and user administration
- Patient Management: View patient details, scan history, and treatments
- Scan Analysis: Detailed view of scan results with all quantitative parameters

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.
