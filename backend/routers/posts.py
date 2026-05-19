import uuid
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from firebase_admin import firestore as fb_firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from models import CreatePostBody, ClaimPostBody
from deps import get_current_user, require_role
from rate_limiter import limiter
from services import firestore_repo, notifications

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("")
@limiter.limit("20/minute")
async def create_post(
    request: Request,
    body: CreatePostBody,
    user: dict = Depends(require_role("helper", "needy")),
):
    data = body.model_dump()
    data["authorId"] = user["uid"]
    data["matchedPostId"] = None
    return firestore_repo.create_post(data)


@router.get("")
@limiter.limit("60/minute")
async def list_posts(
    request: Request,
    kind: str = Query(..., pattern="^(offer|need)$"),
    lat: float = Query(None),
    lng: float = Query(None),
    radius_km: float = Query(20, alias="radiusKm", ge=0.5, le=100),
    limit: int = Query(20, ge=1, le=50),
    cursor: str = Query(None, description="postId of the last seen item for pagination"),
    user: dict = Depends(get_current_user),
):
    blocked_uids = firestore_repo.get_blocked_uids(user["uid"])
    posts = firestore_repo.list_posts(
        kind=kind,
        limit=limit,
        cursor_post_id=cursor,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        blocked_uids=blocked_uids,
    )
    next_cursor = posts[-1]["postId"] if len(posts) == limit else None
    return {"posts": posts, "nextCursor": next_cursor}


@router.get("/{post_id}")
@limiter.limit("60/minute")
async def get_post(
    request: Request,
    post_id: str,
    user: dict = Depends(get_current_user),
):
    post = firestore_repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/{post_id}/claim")
@limiter.limit("20/minute")
async def claim_post(
    request: Request,
    post_id: str,
    body: ClaimPostBody,
    user: dict = Depends(require_role("helper", "needy")),
):
    db_client = firestore_repo.db()
    post_ref = db_client.collection("posts").document(post_id)
    matches_col = db_client.collection("matches")

    errors: dict = {}
    match_result: dict = {}

    @fb_firestore.transactional
    def _claim(transaction):
        post_snap = post_ref.get(transaction=transaction)
        if not post_snap.exists:
            errors["code"] = 404
            return

        post = post_snap.to_dict()

        if post["status"] != "open":
            errors["code"] = 409
            errors["detail"] = "Post is not open for claiming"
            return

        if post["authorId"] == user["uid"]:
            errors["code"] = 403
            errors["detail"] = "You cannot claim your own post"
            return

        items = post["items"]

        if body.item_claims is not None:
            claim_map = {c.index: c.quantity for c in body.item_claims}
        else:
            claim_map = {
                i: item["quantity"]
                for i, item in enumerate(items)
                if not item.get("claimedMatchId")
            }

        valid_claims: dict[int, int] = {}
        for idx, qty in claim_map.items():
            if idx < 0 or idx >= len(items):
                continue
            item = items[idx]
            if item.get("claimedMatchId"):
                continue
            clamped = max(1, min(qty, item["quantity"]))
            valid_claims[idx] = clamped

        if not valid_claims:
            errors["code"] = 409
            errors["detail"] = "All selected items are already claimed"
            return

        if post["kind"] == "need":
            helper_id = user["uid"]
            needy_id = post["authorId"]
        else:
            helper_id = post["authorId"]
            needy_id = user["uid"]

        needy_ref = db_client.collection("users").document(needy_id)
        needy_snap = needy_ref.get(transaction=transaction)
        needy_user = needy_snap.to_dict() if needy_snap.exists else {}

        match_id = str(uuid.uuid4())
        match_items = [
            {**items[i], "quantity": qty}
            for i, qty in valid_claims.items()
        ]
        now = datetime.now(timezone.utc)

        match_data = {
            "matchId": match_id,
            "offerPostId": post_id if post["kind"] == "offer" else body.matching_post_id,
            "needPostId": post_id if post["kind"] == "need" else body.matching_post_id,
            "helperId": helper_id,
            "needyId": needy_id,
            "driverId": None,
            "driver": None,
            "etaMinutes": random.randint(15, 30),
            "etaSetAt": None,
            "status": "pending_driver",
            "deliveredAt": None,
            "cancelledAt": None,
            "cancelReason": None,
            "items": match_items,
            "pickupLocation": post.get("location"),
            "dropoffLocation": needy_user.get("location"),
            "createdAt": SERVER_TIMESTAMP,
        }

        transaction.set(matches_col.document(match_id), match_data)

        updated_items = []
        for i, item in enumerate(items):
            if i not in valid_claims:
                updated_items.append(item)
                continue
            remaining = item["quantity"] - valid_claims[i]
            if remaining <= 0:
                updated_items.append({**item, "quantity": 0, "claimedMatchId": match_id})
            else:
                updated_items.append({**item, "quantity": remaining})

        all_claimed = all(it.get("claimedMatchId") for it in updated_items)
        post_updates: dict = {"items": updated_items}
        if all_claimed:
            post_updates["status"] = "claimed"
        transaction.update(post_ref, post_updates)

        match_result["data"] = {**match_data, "createdAt": now.isoformat()}

    _claim(db_client.transaction())

    if errors:
        raise HTTPException(
            status_code=errors["code"],
            detail=errors.get("detail", "Error processing claim"),
        )

    # Notify helper that their donation was claimed (best-effort)
    notifications.notify_new_match(match_result["data"])

    return match_result["data"]
