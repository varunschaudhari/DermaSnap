"""
Seed default users for local development and web dashboard access.

Usage:
    python scripts/seed_users.py
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

import sys

# Ensure backend package imports work when script is run directly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from auth.auth import get_password_hash  # noqa: E402


def _load_config() -> Dict[str, str]:
    load_dotenv(BACKEND_DIR / ".env")
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "dermasnap")
    return {"mongo_url": mongo_url, "db_name": db_name}


def _seed_definitions() -> List[Dict[str, str]]:
    # Override with env vars if you want custom credentials.
    admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@dermasnap.app")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "Admin@123")
    doctor_email = os.environ.get("SEED_DOCTOR_EMAIL", "doctor@dermasnap.app")
    doctor_password = os.environ.get("SEED_DOCTOR_PASSWORD", "Doctor@123")

    return [
        {
            "email": admin_email,
            "full_name": "Default Admin",
            "role": "admin",
            "password": admin_password,
        },
        {
            "email": doctor_email,
            "full_name": "Default Doctor",
            "role": "doctor",
            "password": doctor_password,
        },
    ]


def _upsert_user(users: Collection, seed_user: Dict[str, str]) -> str:
    now = datetime.now(timezone.utc)
    password_hash = get_password_hash(seed_user["password"])
    existing = users.find_one({"email": seed_user["email"]})

    if existing:
        users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "full_name": seed_user["full_name"],
                    "role": seed_user["role"],
                    "hashed_password": password_hash,
                    "is_active": True,
                    "updated_at": now,
                }
            },
        )
        return "updated"

    users.insert_one(
        {
            "email": seed_user["email"],
            "full_name": seed_user["full_name"],
            "role": seed_user["role"],
            "hashed_password": password_hash,
            "oauth_provider": None,
            "oauth_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    return "created"


def main() -> None:
    config = _load_config()
    client = MongoClient(config["mongo_url"], serverSelectionTimeoutMS=10000)
    try:
        # Force a connection early to give clear feedback if Mongo is down.
        client.admin.command("ping")
        db = client[config["db_name"]]
        users = db["users"]

        # Keep email uniqueness for auth/login consistency.
        users.create_index("email", unique=True)

        print(f"Connected to DB '{config['db_name']}'")
        for seed_user in _seed_definitions():
            action = _upsert_user(users, seed_user)
            print(
                f"- {action}: {seed_user['role']} -> {seed_user['email']} "
                f"(password: {seed_user['password']})"
            )

        print("Seeding complete.")
    except PyMongoError as exc:
        print(f"Failed to seed users: {exc}")
        print("Make sure MongoDB is running and MONGO_URL is correct in backend/.env.")
        raise SystemExit(1) from exc
    finally:
        client.close()


if __name__ == "__main__":
    main()
