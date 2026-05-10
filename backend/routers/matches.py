from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from services import firestore_repo

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("")
async def list_pending_matches(user=Depends(get_current_user)):
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
async def get_match(match_id: str, user=Depends(get_current_user)):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/{match_id}/accept")
async def accept_match(match_id: str, user=Depends(get_current_user)):
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
    })
    return {"ok": True}


_CHAT_SUBCOLLECTIONS = [
    "chat_group",
    "chat_helper_needy",
    "chat_helper_driver",
    "chat_needy_driver",
]


def _delete_subcollection(col_ref, batch_size: int = 100) -> None:
    docs = list(col_ref.limit(batch_size).stream())
    for doc in docs:
        doc.reference.delete()
    if len(docs) >= batch_size:
        _delete_subcollection(col_ref, batch_size)


@router.post("/{match_id}/deliver")
async def deliver_match(match_id: str, user=Depends(get_current_user)):
    match = firestore_repo.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    firestore_repo.update_match(
        match_id,
        {"status": "delivered", "deliveredAt": datetime.now(timezone.utc)},
    )

    def _resolve_post_status(post_id: str) -> None:
        post = firestore_repo.get_post(post_id)
        if not post:
            return
        has_remaining = any(
            item.get("quantity", 0) > 0 and not item.get("claimedMatchId")
            for item in post.get("items", [])
        )
        new_status = "partially_delivered" if has_remaining else "delivered"
        firestore_repo.update_post(post_id, {"status": new_status})

    if match.get("offerPostId"):
        _resolve_post_status(match["offerPostId"])
    if match.get("needPostId"):
        _resolve_post_status(match["needPostId"])
    match_ref = firestore_repo.db().collection("matches").document(match_id)
    for sub in _CHAT_SUBCOLLECTIONS:
        _delete_subcollection(match_ref.collection(sub))
    return {"ok": True}
