from datetime import datetime, timezone, timedelta
from firebase_admin import firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
import pygeohash as gh

_db = None

_EXPIRY_DAYS = {"food": 3, "clothing": 30, "mixed": 7}


def db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


# ── Users ─────────────────────────────────────────────────────────────────

def get_user(uid: str) -> dict | None:
    doc = db().collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


def upsert_user(uid: str, data: dict) -> None:
    db().collection("users").document(uid).set(data, merge=True)


def add_fcm_token(uid: str, token: str) -> None:
    db().collection("users").document(uid).update(
        {"fcmTokens": firestore.ArrayUnion([token])}
    )


def remove_fcm_token(uid: str, token: str) -> None:
    db().collection("users").document(uid).update(
        {"fcmTokens": firestore.ArrayRemove([token])}
    )


# ── Posts ──────────────────────────────────────────────────────────────────

def get_post(post_id: str) -> dict | None:
    doc = db().collection("posts").document(post_id).get()
    return doc.to_dict() if doc.exists else None


def create_post(data: dict) -> dict:
    ref = db().collection("posts").document()
    now = datetime.now(timezone.utc)

    if "photo_url" in data:
        data["photoURL"] = data.pop("photo_url")

    loc = data.get("location", {})
    if loc.get("lat") and loc.get("lng"):
        data["geohash"] = gh.encode(loc["lat"], loc["lng"], precision=9)

    category = data.get("category", "mixed")
    days = _EXPIRY_DAYS.get(category, 7)
    data["expiresAt"] = now + timedelta(days=days)

    data["postId"] = ref.id
    data["createdAt"] = SERVER_TIMESTAMP
    data["status"] = "open"
    ref.set(data)
    return {**data, "createdAt": now.isoformat(), "postId": ref.id,
            "expiresAt": data["expiresAt"].isoformat()}


def update_post(post_id: str, updates: dict) -> None:
    db().collection("posts").document(post_id).update(updates)


def list_posts(
    kind: str,
    limit: int = 20,
    cursor_post_id: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 20.0,
    blocked_uids: set[str] | None = None,
) -> list[dict]:
    now = datetime.now(timezone.utc)

    if lat is not None and lng is not None:
        precision = _geo_precision(radius_km)
        center_hash = gh.encode(lat, lng, precision=precision)
        neighbor_dict = gh.neighbors(center_hash)
        prefixes = [center_hash] + list(neighbor_dict.values())
        docs: list[dict] = []
        for prefix in prefixes:
            # Range query: all geohashes starting with this prefix
            prefix_end = prefix[:-1] + chr(ord(prefix[-1]) + 1)
            q = (
                db()
                .collection("posts")
                .where("kind", "==", kind)
                .where("status", "in", ["open", "partially_delivered"])
                .where("geohash", ">=", prefix)
                .where("geohash", "<", prefix_end)
                .limit(limit)
                .stream()
            )
            docs.extend(d.to_dict() for d in q)
        seen: set[str] = set()
        result = []
        for d in docs:
            if d.get("postId") in seen:
                continue
            seen.add(d["postId"])
            expires = d.get("expiresAt")
            if expires and _to_utc(expires) < now:
                continue
            if blocked_uids and d.get("authorId") in blocked_uids:
                continue
            result.append(d)
        result.sort(key=lambda d: _ts(d.get("createdAt")), reverse=True)
        return result[:limit]

    # Non-geo path: cursor-based pagination
    q = (
        db()
        .collection("posts")
        .where("kind", "==", kind)
        .where("status", "in", ["open", "partially_delivered"])
        .order_by("createdAt", direction="DESCENDING")
    )
    if cursor_post_id:
        cursor_snap = db().collection("posts").document(cursor_post_id).get()
        if cursor_snap.exists:
            q = q.start_after(cursor_snap)

    docs_raw = list(q.limit(limit).stream())
    result = []
    for d in docs_raw:
        data = d.to_dict()
        expires = data.get("expiresAt")
        if expires and _to_utc(expires) < now:
            continue
        if blocked_uids and data.get("authorId") in blocked_uids:
            continue
        result.append(data)
    return result


# ── Matches ────────────────────────────────────────────────────────────────

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


# ── Ratings ────────────────────────────────────────────────────────────────

def create_rating(
    rated_uid: str, rater_uid: str, match_id: str, stars: int, comment: str
) -> None:
    now = datetime.now(timezone.utc)
    db().collection("users").document(rated_uid).collection("ratings").add({
        "matchId": match_id,
        "raterId": rater_uid,
        "stars": stars,
        "comment": comment,
        "createdAt": now,
    })
    user_ref = db().collection("users").document(rated_uid)

    @firestore.transactional
    def _update_avg(tx):
        snap = user_ref.get(transaction=tx)
        doc_data = snap.to_dict() or {}
        count = doc_data.get("ratingCount", 0) + 1
        total = doc_data.get("ratingTotal", 0) + stars
        tx.update(user_ref, {
            "ratingCount": count,
            "ratingTotal": total,
            "ratingAvg": round(total / count, 2),
        })

    _update_avg(db().transaction())


def has_rated(rated_uid: str, rater_uid: str, match_id: str) -> bool:
    docs = (
        db()
        .collection("users")
        .document(rated_uid)
        .collection("ratings")
        .where("matchId", "==", match_id)
        .where("raterId", "==", rater_uid)
        .limit(1)
        .stream()
    )
    return any(True for _ in docs)


# ── Expiry ────────────────────────────────────────────────────────────────

def expire_old_posts(batch_size: int = 200) -> int:
    now = datetime.now(timezone.utc)
    q = (
        db()
        .collection("posts")
        .where("status", "==", "open")
        .where("expiresAt", "<", now)
        .limit(batch_size)
        .stream()
    )
    docs = list(q)
    batch = db().batch()
    for doc in docs:
        batch.update(doc.reference, {"status": "expired"})
    if docs:
        batch.commit()
    return len(docs)


# ── Reports ───────────────────────────────────────────────────────────────

def create_report(
    reporter_uid: str,
    target_type: str,
    target_id: str,
    reason: str,
    details: str | None,
) -> str:
    now = datetime.now(timezone.utc)
    ref = db().collection("reports").document()
    ref.set({
        "reportId": ref.id,
        "reporterUid": reporter_uid,
        "targetType": target_type,
        "targetId": target_id,
        "reason": reason,
        "details": details or "",
        "status": "pending",
        "createdAt": now,
    })
    return ref.id


# ── Blocks ─────────────────────────────────────────────────────────────────

def block_user(blocker_uid: str, blocked_uid: str) -> None:
    now = datetime.now(timezone.utc)
    db().collection("users").document(blocker_uid) \
        .collection("blocks").document(blocked_uid) \
        .set({"blockedAt": now, "blockedUid": blocked_uid})


def unblock_user(blocker_uid: str, blocked_uid: str) -> None:
    db().collection("users").document(blocker_uid) \
        .collection("blocks").document(blocked_uid) \
        .delete()


def get_blocked_uids(uid: str) -> set[str]:
    docs = db().collection("users").document(uid).collection("blocks").stream()
    return {d.id for d in docs}


def is_blocked(blocker_uid: str, blocked_uid: str) -> bool:
    doc = db().collection("users").document(blocker_uid) \
        .collection("blocks").document(blocked_uid).get()
    return doc.exists


# ── Private helpers ────────────────────────────────────────────────────────

def _geo_precision(radius_km: float) -> int:
    if radius_km <= 1:
        return 6
    if radius_km <= 5:
        return 5
    return 4


def _to_utc(value) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    if hasattr(value, "seconds"):
        return datetime.fromtimestamp(value.seconds, tz=timezone.utc)
    return datetime.now(timezone.utc)


def _ts(value) -> float:
    try:
        return _to_utc(value).timestamp()
    except Exception:
        return 0.0
