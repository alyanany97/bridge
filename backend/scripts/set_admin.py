#!/usr/bin/env python3
"""
One-time script to grant a user the admin role.

Usage:
    cd bridge/backend
    python scripts/set_admin.py <firebase_uid>

The user must sign out and sign back in for the new token claim to take effect.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

import firebase_admin
from firebase_admin import auth, firestore


def set_admin(uid: str) -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()

    auth.set_custom_user_claims(uid, {"role": "admin"})

    db = firestore.client()
    db.collection("users").document(uid).set({"role": "admin"}, merge=True)

    print(f"✓ Admin role set for uid: {uid}")
    print("  Sign out and sign back in for the new claim to take effect.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/set_admin.py <firebase_uid>")
        sys.exit(1)
    set_admin(sys.argv[1])
