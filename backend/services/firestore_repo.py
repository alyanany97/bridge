from datetime import datetime, timezone
from firebase_admin import firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

_db = None


def db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


def get_user(uid: str) -> dict | None:
    doc = db().collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


def get_post(post_id: str) -> dict | None:
    doc = db().collection("posts").document(post_id).get()
    return doc.to_dict() if doc.exists else None


def create_post(data: dict) -> dict:
    ref = db().collection("posts").document()
    now = datetime.now(timezone.utc)
    # Normalize snake_case fields to camelCase to match frontend Post interface
    if "photo_url" in data:
        data["photoURL"] = data.pop("photo_url")
    data["postId"] = ref.id
    data["createdAt"] = SERVER_TIMESTAMP
    data["status"] = "open"
    ref.set(data)
    return {**data, "createdAt": now.isoformat(), "postId": ref.id}


def update_post(post_id: str, updates: dict) -> None:
    db().collection("posts").document(post_id).update(updates)


def get_match(match_id: str) -> dict | None:
    doc = db().collection("matches").document(match_id).get()
    return doc.to_dict() if doc.exists else None


def create_match(data: dict) -> dict:
    match_id = data.get("matchId") or db().collection("matches").document().id
    ref = db().collection("matches").document(match_id)
    now = datetime.now(timezone.utc)
    data["matchId"] = match_id
    data["createdAt"] = SERVER_TIMESTAMP
    ref.set(data)
    return {**data, "createdAt": now.isoformat(), "matchId": match_id}


def update_match(match_id: str, updates: dict) -> None:
    db().collection("matches").document(match_id).update(updates)


def list_posts(kind: str, limit: int = 50) -> list[dict]:
    docs = (
        db()
        .collection("posts")
        .where("kind", "==", kind)
        .where("status", "==", "open")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [d.to_dict() for d in docs]
