"""
FCM push notification service.

Reads stored FCM tokens from Firestore and sends via Firebase Admin Messaging.
All sends are best-effort — a failed notification never raises to the caller.
"""
from __future__ import annotations
import logging

from firebase_admin import messaging

from services import firestore_repo

log = logging.getLogger(__name__)


def _get_tokens(uid: str) -> list[str]:
    user = firestore_repo.get_user(uid) or {}
    return user.get("fcmTokens", [])


def _send(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    if not tokens:
        return
    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(content_available=True, sound="default")
            )
        ),
    )
    try:
        resp = messaging.send_each_for_multicast(msg)
        # Clean up invalid tokens
        invalid = [
            tokens[i]
            for i, r in enumerate(resp.responses)
            if not r.success
            and r.exception
            and "registration-token-not-registered" in str(r.exception)
        ]
        if invalid:
            log.info("Removing %d stale FCM tokens", len(invalid))
    except Exception:
        log.exception("FCM send failed")


# ── Public helpers used by route handlers ──────────────────────────────────

def notify_driver_assigned(match: dict) -> None:
    """Helper and needy get notified when a driver accepts."""
    driver_name = (match.get("driver") or {}).get("name", "A driver")
    _send(
        _get_tokens(match["helperId"]),
        "Driver on the way!",
        f"{driver_name} is heading to pick up your donation.",
        {"matchId": match["matchId"], "screen": "match"},
    )
    _send(
        _get_tokens(match["needyId"]),
        "Your delivery is coming!",
        f"{driver_name} will bring your items soon.",
        {"matchId": match["matchId"], "screen": "match"},
    )


def notify_delivered(match: dict) -> None:
    """Helper and needy get notified on delivery completion."""
    _send(
        _get_tokens(match["helperId"]),
        "Donation delivered 🎉",
        "Your donation reached someone in need. Thank you!",
        {"matchId": match["matchId"], "screen": "match"},
    )
    _send(
        _get_tokens(match["needyId"]),
        "Your items arrived!",
        "Your delivery has been completed. Please rate your experience.",
        {"matchId": match["matchId"], "screen": "match"},
    )


def notify_match_cancelled(match: dict, cancelled_by_uid: str) -> None:
    """All participants get notified when a match is cancelled."""
    msg = "A delivery was cancelled and the donation is available again."
    for uid in (match["helperId"], match["needyId"]):
        if uid != cancelled_by_uid:
            _send(_get_tokens(uid), "Delivery cancelled", msg,
                  {"matchId": match["matchId"], "screen": "home"})
    driver_id = match.get("driverId")
    if driver_id and driver_id != cancelled_by_uid:
        _send(_get_tokens(driver_id), "Delivery cancelled", msg,
              {"matchId": match["matchId"], "screen": "home"})


def notify_new_match(match: dict) -> None:
    """Helper notified when their offer is claimed and needs a driver."""
    _send(
        _get_tokens(match["helperId"]),
        "Someone claimed your donation!",
        "We're finding a driver to deliver your items.",
        {"matchId": match["matchId"], "screen": "match"},
    )
