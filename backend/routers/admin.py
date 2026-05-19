from fastapi import APIRouter, Depends, HTTPException, Query, Request
from firebase_admin import auth as fb_auth

from deps import require_role
from rate_limiter import limiter
from models import ResolveReportBody
from services import firestore_repo

router = APIRouter(prefix="/admin", tags=["admin"])

_admin = Depends(require_role("admin"))


@router.get("/reports")
@limiter.limit("30/minute")
async def get_reports(
    request: Request,
    status: str = "pending",
    limit: int = 50,
    _: dict = _admin,
):
    return {"reports": firestore_repo.list_reports(status=status, limit=min(limit, 200))}


@router.post("/reports/{report_id}/resolve")
@limiter.limit("30/minute")
async def resolve_report(
    request: Request,
    report_id: str,
    body: ResolveReportBody,
    _: dict = _admin,
):
    firestore_repo.resolve_report(report_id, body.action, body.note)
    return {"ok": True}


@router.get("/users")
@limiter.limit("60/minute")
async def list_users(
    request: Request,
    search: str = "",
    limit: int = 50,
    _: dict = _admin,
):
    return {"users": firestore_repo.list_users(search=search.strip(), limit=min(limit, 200))}


@router.get("/users/{uid}")
@limiter.limit("60/minute")
async def get_user_detail(
    request: Request,
    uid: str,
    _: dict = _admin,
):
    user = firestore_repo.get_user(uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Enrich with Firebase Auth email if missing
    try:
        fb_user = fb_auth.get_user(uid)
        user.setdefault("email", fb_user.email)
        user["emailVerified"] = fb_user.email_verified
        user["disabled"] = fb_user.disabled
    except Exception:
        pass
    # Count user's posts
    user["postCount"] = firestore_repo.count_user_posts(uid)
    return firestore_repo._serialize(user)


@router.post("/users/{uid}/suspend")
@limiter.limit("20/minute")
async def suspend_user(
    request: Request,
    uid: str,
    user: dict = Depends(require_role("admin")),
):
    if uid == user["uid"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    fb_auth.update_user(uid, disabled=True)
    firestore_repo.suspend_user(uid)
    return {"ok": True}


@router.delete("/users/{uid}/suspend")
@limiter.limit("20/minute")
async def unsuspend_user(
    request: Request,
    uid: str,
    _: dict = _admin,
):
    fb_auth.update_user(uid, disabled=False)
    firestore_repo.unsuspend_user(uid)
    return {"ok": True}


@router.get("/posts")
@limiter.limit("30/minute")
async def list_posts(
    request: Request,
    kind: str = Query(None, pattern="^(offer|need)$"),
    status: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _: dict = _admin,
):
    return {"posts": firestore_repo.list_all_posts(kind=kind, status=status, limit=limit)}


@router.delete("/posts/{post_id}")
@limiter.limit("20/minute")
async def remove_post(
    request: Request,
    post_id: str,
    user: dict = Depends(require_role("admin")),
):
    post = firestore_repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    firestore_repo.update_post(post_id, {"status": "removed", "removedBy": user["uid"]})
    return {"ok": True}


@router.put("/posts/{post_id}/restore")
@limiter.limit("20/minute")
async def restore_post(
    request: Request,
    post_id: str,
    _: dict = _admin,
):
    post = firestore_repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    firestore_repo.update_post(post_id, {"status": "open"})
    return {"ok": True}
