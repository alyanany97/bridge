"""
Google Cloud Vision SafeSearch moderation.

Uses the Vision REST API (no extra SDK needed — google-auth is already
a transitive dependency of firebase-admin) to check images for adult,
violent, or explicit content before they are processed or stored.
"""
from __future__ import annotations

import logging

import requests as http_requests
import google.auth
import google.auth.transport.requests

log = logging.getLogger(__name__)

_VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
_BLOCK_LEVELS = {"LIKELY", "VERY_LIKELY"}

_credentials = None
_auth_request = google.auth.transport.requests.Request()


def _access_token() -> str:
    global _credentials
    if _credentials is None:
        _credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    if not _credentials.valid:
        _credentials.refresh(_auth_request)
    return _credentials.token


def check_safe_search(image_url: str) -> None:
    """
    Calls Vision SafeSearch on image_url. Raises ValueError with a user-facing
    message if the image is flagged as adult, violent, or racy.

    All errors are best-effort — network failures log a warning and pass through
    so a Vision outage never blocks legitimate posts.
    """
    try:
        token = _access_token()
        payload = {
            "requests": [{
                "image": {"source": {"imageUri": image_url}},
                "features": [{"type": "SAFE_SEARCH_DETECTION"}],
            }]
        }
        resp = http_requests.post(
            _VISION_URL,
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        annotation = (
            data.get("responses", [{}])[0]
            .get("safeSearchAnnotation", {})
        )

        for field in ("adult", "violence", "racy"):
            if annotation.get(field) in _BLOCK_LEVELS:
                raise ValueError(
                    "This image was flagged for inappropriate content and cannot be posted. "
                    "Please use a different photo."
                )

    except ValueError:
        raise  # Re-raise our own content violation errors
    except Exception:
        log.warning("SafeSearch check failed (non-blocking)", exc_info=True)
