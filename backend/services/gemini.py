import os
import json
import requests
from google import genai
from google.genai import types

_client = None


def client():
    global _client
    if _client is None:
        project = os.environ.get("FIREBASE_PROJECT_ID", "helper-495902")
        _client = genai.Client(vertexai=True, project=project, location="us-central1")
    return _client


_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-preview-05-20")

OFFER_SCHEMA = {
    "type": "object",
    "required": ["category", "items", "description"],
    "properties": {
        "category": {"type": "string", "enum": ["food", "clothing", "mixed"]},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "quantity"],
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "integer"},
                    "size": {"type": "string"},
                    "condition": {"type": "string"},
                    "expiresEstimate": {"type": "string"},
                },
            },
        },
        "description": {"type": "string"},
    },
}

NEED_SCHEMA = {
    "type": "object",
    "required": ["category", "items", "description"],
    "properties": {
        "category": {"type": "string", "enum": ["food", "clothing", "mixed"]},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "quantity"],
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "integer"},
                    "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
                },
            },
        },
        "description": {"type": "string"},
    },
}

OFFER_PROMPT = (
    "You are an assistant for a mutual-aid donation app. The image shows items the user "
    "wants to donate. Return JSON identifying each donatable item. Be concrete (say "
    "'Canned tomato soup' not 'soup', 'Men's cotton t-shirt' not 'shirt'). For clothing, "
    "infer condition from visible wear (new, gently used, well-worn). For food, give a "
    "rough expires estimate when visible (e.g. '2026-12' or 'long shelf life'). Skip the "
    "field if unsure. The description should be one short, neutral sentence."
)

NEED_PROMPT = (
    "You are an assistant for a mutual-aid app. The user has photographed something to "
    "convey what would help them — an empty pantry, worn shoes, an outgrown coat, an "
    "empty fridge, etc. Identify what would meaningfully help and translate it into a "
    "request. Be respectful, non-judgmental, specific (e.g. 'warm winter coat, child "
    "size 7-8' not 'clothes'). The description must read as a polite first-person request."
)


def _fetch_image_bytes(photo_url: str) -> bytes:
    """Fetch image bytes from a download URL or gs:// URI."""
    if photo_url.startswith("gs://"):
        from firebase_admin import storage as fb_storage
        bucket_name, blob_path = photo_url[5:].split("/", 1)
        bucket = fb_storage.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        return blob.download_as_bytes()
    else:
        resp = requests.get(photo_url, timeout=15)
        resp.raise_for_status()
        return resp.content


def parse_photo(photo_url: str, kind: str) -> dict:
    schema = OFFER_SCHEMA if kind == "offer" else NEED_SCHEMA
    prompt = OFFER_PROMPT if kind == "offer" else NEED_PROMPT
    image_bytes = _fetch_image_bytes(photo_url)
    resp = client().models.generate_content(
        model=_MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        ),
    )
    return json.loads(resp.text)
