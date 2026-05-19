from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from deps import get_current_user, require_role
from rate_limiter import limiter
from models import RateMatchBody, CancelMatchBody
from services import firestore_repo, notifications

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("")
@limiter.limit("60/minute")
async def list_pending_matches(
    request: Request,
    user: dict = Depends(require_role("driver")),
):
    docs = (
        firestore_repo.db()
        .collection("matches")
        .where("status", "==", "pending_driver")
        .order_by("createdAt", direction="DESCENDING")
        .limit(50)
        .stream()
    )
    return {"matches": [d.to_dict() for d in docs]}


@router.get("/{match_id}")
@limiter.limit("60/minute")
async def get_match(
    request: Request,
    match_id: str,
    user: dict = Depends(get_current_user),
):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    uid = user["uid"]
    is_participant = uid in (match.get("helperId"), match.get("needyId"), match.get("driverId"))
    is_browsable = match.get("status") == "pending_driver" and user.get("role") == "driver"
    if not is_participant and not is_browsable:
        raise HTTPException(status_code=403, detail="Access denied")

    return match


@router.post("/{match_id}/accept")
@limiter.limit("20/minute")
async def accept_match(
    request: Request,
    match_id: str,
    user: dict = Depends(require_role("driver")),
):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["status"] != "pending_driver":
        raise HTTPException(status_code=409, detail="Match is no longer available")

    firestore_repo.update_match(match_id, {
        "status": "in_transit",
        "driverId": user["uid"],
        "driver": {"name": user.get("name", "Driver"), "phone": ""},
        "etaSetAt": datetime.now(timezone.utc),
        # Store RTDB path so clients know where to listen for live location
        "locationPath": f"locations/{user['uid']}",
    })

    updated = firestore_repo.get_match(match_id)
    notifications.notify_driver_assigned(updated)

    return {"ok": True}


@router.post("/{match_id}/cancel")
@limiter.limit("10/minute")
async def cancel_match(
    request: Request,
    match_id: str,
    body: CancelMatchBody,
    user: dict = Depends(get_current_user),
):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    uid = user["uid"]
    is_participant = uid in (match.get("helperId"), match.get("needyId"), match.get("driverId"))
    if not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")

    if match["status"] not in ("pending_driver", "in_transit"):
        raise HTTPException(status_code=409,
                            detail="Cannot cancel a completed or already-cancelled match")

    now = datetime.now(timezone.utc)
    firestore_repo.update_match(match_id, {
        "status": "cancelled",
        "cancelledAt": now,
        "cancelReason": body.reason or "",
        "cancelledBy": uid,
    })

    # Re-open claimed items on the original post so they can be claimed again
    _reopen_post_items(match)

    notifications.notify_match_cancelled(match, cancelled_by_uid=uid)

    return {"ok": True}


@router.post("/{match_id}/deliver")
@limiter.limit("10/minute")
async def deliver_match(
    request: Request,
    match_id: str,
    user: dict = Depends(require_role("driver")),
):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.get("driverId") != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the assigned driver can mark delivery complete")
    if match.get("status") != "in_transit":
        raise HTTPException(status_code=409, detail="Match is not in transit")

    firestore_repo.update_match(
        match_id,
        {"status": "delivered", "deliveredAt": datetime.now(timezone.utc)},
    )

    _resolve_post_status(match.get("offerPostId"))
    _resolve_post_status(match.get("needPostId"))

    # Clean up live location node from RTDB path (client-side cleanup triggered via Firestore status)
    match_ref = firestore_repo.db().collection("matches").document(match_id)
    for sub in _CHAT_SUBCOLLECTIONS:
        _delete_subcollection(match_ref.collection(sub))

    updated = firestore_repo.get_match(match_id)
    notifications.notify_delivered(updated)

    return {"ok": True}


@router.post("/{match_id}/rate")
@limiter.limit("10/minute")
async def rate_match(
    request: Request,
    match_id: str,
    body: RateMatchBody,
    user: dict = Depends(get_current_user),
):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.get("status") != "delivered":
        raise HTTPException(status_code=409, detail="Can only rate completed deliveries")

    uid = user["uid"]
    is_participant = uid in (match.get("helperId"), match.get("needyId"), match.get("driverId"))
    if not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")

    rated_uid = body.rated_uid
    if rated_uid not in (match.get("helperId"), match.get("needyId"), match.get("driverId")):
        raise HTTPException(status_code=400, detail="Rated user is not a match participant")

    if rated_uid == uid:
        raise HTTPException(status_code=400, detail="Cannot rate yourself")

    if firestore_repo.has_rated(rated_uid, uid, match_id):
        raise HTTPException(status_code=409, detail="You have already rated this user for this delivery")

    firestore_repo.create_rating(
        rated_uid=rated_uid,
        rater_uid=uid,
        match_id=match_id,
        stars=body.stars,
        comment=body.comment,
    )

    return {"ok": True}


# ── Private helpers ────────────────────────────────────────────────────────

_CHAT_SUBCOLLECTIONS = [
    "chat_group", "chat_helper_needy", "chat_helper_driver", "chat_needy_driver"
]


def _delete_subcollection(col_ref, batch_size: int = 100) -> None:
    docs = list(col_ref.limit(batch_size).stream())
    for doc in docs:
        doc.reference.delete()
    if len(docs) >= batch_size:
        _delete_subcollection(col_ref, batch_size)


def _resolve_post_status(post_id: str | None) -> None:
    if not post_id:
        return
    post = firestore_repo.get_post(post_id)
    if not post:
        return
    has_remaining = any(
        item.get("quantity", 0) > 0 and not item.get("claimedMatchId")
        for item in post.get("items", [])
    )
    firestore_repo.update_post(
        post_id,
        {"status": "partially_delivered" if has_remaining else "delivered"},
    )


def _reopen_post_items(match: dict) -> None:
    """Restore claimed quantities when a match is cancelled."""
    for post_id in (match.get("offerPostId"), match.get("needPostId")):
        if not post_id:
            continue
        post = firestore_repo.get_post(post_id)
        if not post or post["status"] not in ("open", "claimed"):
            continue
        match_id = match["matchId"]
        restored = []
        for item in post.get("items", []):
            if item.get("claimedMatchId") == match_id:
                # Find how much was claimed via match items snapshot
                claimed_qty = next(
                    (mi["quantity"] for mi in match.get("items", [])
                     if mi.get("name") == item.get("name")),
                    0,
                )
                restored.append({**item, "quantity": item["quantity"] + claimed_qty,
                                  "claimedMatchId": None})
            else:
                restored.append(item)
        firestore_repo.update_post(post_id, {"items": restored, "status": "open"})
