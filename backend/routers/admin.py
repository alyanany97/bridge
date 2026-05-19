from fastapi import APIRouter, Depends, HTTPException, Request
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
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    search: str = "",
    limit: int = 50,
    _: dict = _admin,
):
    return {"users": firestore_repo.list_users(search=search.lower().strip(), limit=min(limit, 200))}


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
