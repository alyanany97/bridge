import uuid
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from firebase_admin import firestore

from models import CreatePostBody, ClaimPostBody, ItemClaim
from deps import get_current_user
from services import firestore_repo

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("")
async def create_post(body: CreatePostBody, user=Depends(get_current_user)):
    data = body.model_dump()
    data["authorId"] = user["uid"]
    data["matchedPostId"] = None
    return firestore_repo.create_post(data)


@router.get("")
async def list_posts(
    kind: str = Query(..., pattern="^(offer|need)$"),
    near: str = Query(None),
    radius_km: float = Query(20, alias="radiusKm"),
    user=Depends(get_current_user),
):
    posts = firestore_repo.list_posts(kind)
    return {"posts": posts}


@router.get("/{post_id}")
async def get_post(post_id: str, user=Depends(get_current_user)):
    post = firestore_repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/{post_id}/claim")
async def claim_post(post_id: str, body: ClaimPostBody, user=Depends(get_current_user)):
    post = firestore_repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["status"] != "open":
        raise HTTPException(status_code=409, detail="Post is not open for claiming")

    items = post["items"]

    # Build claim map: index -> quantity requested
    if body.item_claims is not None:
        claim_map = {c.index: c.quantity for c in body.item_claims}
    else:
        # Default: claim all unclaimed items at full quantity
        claim_map = {
            i: item["quantity"]
            for i, item in enumerate(items)
            if not item.get("claimedMatchId")
        }

    # Validate — filter to indices with remaining stock
    valid_claims: dict[int, int] = {}
    for idx, qty in claim_map.items():
        if idx < 0 or idx >= len(items):
            continue
        item = items[idx]
        if item.get("claimedMatchId"):
            continue  # fully taken already
        available_qty = item["quantity"]
        clamped = max(1, min(qty, available_qty))
        valid_claims[idx] = clamped

    if not valid_claims:
        raise HTTPException(status_code=409, detail="All selected items are already claimed")

    match_id = str(uuid.uuid4())

    # Build match items snapshot (quantities as requested)
    match_items = [
        {**items[i], "quantity": qty}
        for i, qty in valid_claims.items()
    ]

    if post["kind"] == "need":
        helper_id = user["uid"]
        needy_id = post["authorId"]
    else:
        helper_id = post["authorId"]
        needy_id = user["uid"]

    # Look up needy user's stored location for dropoff display
    needy_user = firestore_repo.get_user(needy_id)
    dropoff_location = needy_user.get("location") if needy_user else None
    pickup_location = post.get("location")  # where the items currently are

    # Write match FIRST — if this fails nothing is left in a broken state
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
        "items": match_items,
        "pickupLocation": pickup_location,
        "dropoffLocation": dropoff_location,
    }
    match = firestore_repo.create_match(match_data)

    # Only update post items after match is safely written
    updated_items = []
    for i, item in enumerate(items):
        if i not in valid_claims:
            updated_items.append(item)
            continue
        qty_taken = valid_claims[i]
        remaining = item["quantity"] - qty_taken
        if remaining <= 0:
            updated_items.append({**item, "quantity": 0, "claimedMatchId": match_id})
        else:
            updated_items.append({**item, "quantity": remaining})

    all_claimed = all(it.get("claimedMatchId") for it in updated_items)
    post_updates: dict = {"items": updated_items}
    if all_claimed:
        post_updates["status"] = "claimed"
    firestore_repo.update_post(post_id, post_updates)

    return match
