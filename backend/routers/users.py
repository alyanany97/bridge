"""
User management — role assignment (custom claims) and FCM token registration.
"""
import os
from firebase_admin import auth as fb_auth
from fastapi import APIRouter, Depends, Header, HTTPException, Request

from deps import get_current_user, require_role
from rate_limiter import limiter
from models import SetRoleBody, UpdateProfileBody, RegisterFcmTokenBody, RemoveFcmTokenBody
from services import firestore_repo

router = APIRouter(prefix="/users", tags=["users"])


@router.delete("/me")
@limiter.limit("3/minute")
async def delete_account(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Permanently deletes the account and all associated data."""
    uid = user["uid"]
    firestore_repo.delete_user_data(uid)
    try:
        fb_auth.delete_user(uid)
    except Exception:
        pass
    return {"ok": True}


@router.post("/role")
@limiter.limit("5/minute")
async def set_role(
    request: Request,
    body: SetRoleBody,
    user: dict = Depends(get_current_user),
):
    """
    Called once during onboarding. Sets the user's role as a Firebase custom
    claim (embedded in the JWT) so no Firestore read is needed on every request.
    Once set, the role cannot be changed by the client.
    """
    if body.role == "admin":
        raise HTTPException(status_code=403, detail="Admin role cannot be set via API")
    if user.get("role") is not None:
        raise HTTPException(status_code=400, detail="Role already set")

    uid = user["uid"]

    # Write custom claim — this is what future JWTs will carry
    fb_auth.set_custom_user_claims(uid, {"role": body.role})

    # Also persist the full user document to Firestore
    user_data = {
        "uid": uid,
        "displayName": body.display_name or user.get("name", ""),
        "email": user.get("email", ""),
        "role": body.role,
        "fcmTokens": [],
        "ratingCount": 0,
        "ratingTotal": 0,
        "ratingAvg": None,
        "suspended": False,
    }
    if body.location:
        user_data["location"] = body.location.model_dump()
    if body.role == "organization":
        user_data["businessName"] = body.business_name or ""
        user_data["businessType"] = body.business_type or "other"

    firestore_repo.upsert_user(uid, user_data)

    return {"ok": True, "role": body.role}


@router.get("/me")
@limiter.limit("30/minute")
async def get_me(
    request: Request,
    user: dict = Depends(get_current_user),
):
    profile = firestore_repo.get_user(user["uid"]) or {}
    return {**profile, "uid": user["uid"], "email": user["email"]}


@router.put("/profile")
@limiter.limit("10/minute")
async def update_profile(
    request: Request,
    body: UpdateProfileBody,
    user: dict = Depends(get_current_user),
):
    updates: dict = {}
    if body.display_name is not None:
        updates["displayName"] = body.display_name
    if body.bio is not None:
        updates["bio"] = body.bio
    if body.location is not None:
        updates["location"] = body.location.model_dump()
    if body.vehicle_type is not None:
        updates["vehicleType"] = body.vehicle_type
    if body.business_name is not None:
        updates["businessName"] = body.business_name
    if body.business_type is not None:
        updates["businessType"] = body.business_type
    if body.website is not None:
        updates["website"] = body.website
    if updates:
        firestore_repo.upsert_user(user["uid"], updates)
    return {"ok": True}


@router.post("/fcm-token")
@limiter.limit("10/minute")
async def register_fcm_token(
    request: Request,
    body: RegisterFcmTokenBody,
    user: dict = Depends(get_current_user),
):
    """Register a device's FCM token so push notifications can be sent."""
    firestore_repo.add_fcm_token(user["uid"], body.token)
    return {"ok": True}


@router.delete("/fcm-token")
@limiter.limit("10/minute")
async def remove_fcm_token(
    request: Request,
    body: RemoveFcmTokenBody,
    user: dict = Depends(get_current_user),
):
    """Remove an FCM token (called on sign-out to stop notifications)."""
    firestore_repo.remove_fcm_token(user["uid"], body.token)
    return {"ok": True}


# ── Blocks ────────────────────────────────────────────────────────────────

@router.post("/{uid}/block")
@limiter.limit("30/minute")
async def block_user(
    request: Request,
    uid: str,
    user: dict = Depends(get_current_user),
):
    if uid == user["uid"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    firestore_repo.block_user(user["uid"], uid)
    return {"ok": True}


@router.delete("/{uid}/block")
@limiter.limit("30/minute")
async def unblock_user(
    request: Request,
    uid: str,
    user: dict = Depends(get_current_user),
):
    firestore_repo.unblock_user(user["uid"], uid)
    return {"ok": True}


@router.get("/blocked")
@limiter.limit("30/minute")
async def get_blocked(
    request: Request,
    user: dict = Depends(get_current_user),
):
    uids = firestore_repo.get_blocked_uids(user["uid"])
    return {"blockedUids": list(uids)}


# ── Admin-only ─────────────────────────────────────────────────────────────

ADMIN_KEY = os.getenv("BRIDGE_ADMIN_KEY", "")


def _verify_admin_key(x_admin_key: str = Header(default="")):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


@router.post("/admin/expire-posts")
async def expire_posts(x_admin_key: str = Header(default="")):
    """
    Called by Cloud Scheduler every 6 hours to mark stale posts as expired.
    Protected by X-Admin-Key header — set BRIDGE_ADMIN_KEY env var on Cloud Run.
    """
    _verify_admin_key(x_admin_key)
    count = firestore_repo.expire_old_posts()
    return {"expired": count}
