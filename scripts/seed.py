"""
Seed script — populates demo posts from seed-photos/.

Usage:
  PROJECT_ID=your_project_id python scripts/seed.py

Drops existing seed-* posts first, then recreates them.
Requires Application Default Credentials (gcloud auth application-default login).
"""
import os
import sys
import uuid
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore, storage

PROJECT_ID = os.environ.get("PROJECT_ID")
if not PROJECT_ID:
    sys.exit("Set PROJECT_ID environment variable")

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={
        "projectId": PROJECT_ID,
        "storageBucket": f"{PROJECT_ID}.appspot.com",
    })

db = firestore.client()
bucket = storage.bucket()

SEED_PHOTOS_DIR = Path(__file__).parent.parent / "seed-photos"
DEMO_CENTER = {"lat": 37.7749, "lng": -122.4194}

SEED_POSTS = [
    {
        "postId_prefix": "seed-offer-food-1",
        "authorId": "seed-helper-1",
        "kind": "offer",
        "category": "food",
        "items": [
            {"name": "Canned tomato soup", "quantity": 4},
            {"name": "Peanut butter, 16oz", "quantity": 1},
        ],
        "description": "Assorted non-perishables from a pantry clear-out.",
        "location": {"lat": DEMO_CENTER["lat"] + 0.005, "lng": DEMO_CENTER["lng"] - 0.003},
        "photo_filename": None,
    },
    {
        "postId_prefix": "seed-offer-clothing-1",
        "authorId": "seed-helper-2",
        "kind": "offer",
        "category": "clothing",
        "items": [
            {"name": "Children's winter coat, size 7-8", "quantity": 1, "condition": "gently used"},
        ],
        "description": "Warm coat, barely worn — child outgrew it.",
        "location": {"lat": DEMO_CENTER["lat"] - 0.004, "lng": DEMO_CENTER["lng"] + 0.006},
        "photo_filename": None,
    },
    {
        "postId_prefix": "seed-need-food-1",
        "authorId": "seed-needy-1",
        "kind": "need",
        "category": "food",
        "items": [
            {"name": "Canned goods or dry pasta", "quantity": 3, "urgency": "high"},
        ],
        "description": "I could really use some staple groceries to get through the week.",
        "location": {"lat": DEMO_CENTER["lat"] + 0.002, "lng": DEMO_CENTER["lng"] + 0.004},
        "photo_filename": None,
    },
    {
        "postId_prefix": "seed-need-clothing-1",
        "authorId": "seed-needy-2",
        "kind": "need",
        "category": "clothing",
        "items": [
            {"name": "Warm winter boots, adult size 10", "quantity": 1, "urgency": "medium"},
        ],
        "description": "Looking for warm boots before the cold snap hits.",
        "location": {"lat": DEMO_CENTER["lat"] - 0.007, "lng": DEMO_CENTER["lng"] - 0.005},
        "photo_filename": None,
    },
]


def upload_photo(filename: str) -> str | None:
    path = SEED_PHOTOS_DIR / filename
    if not path.exists():
        print(f"  Photo not found: {path}, skipping upload")
        return None
    blob = bucket.blob(f"posts/seed-{filename}")
    blob.upload_from_filename(str(path), content_type="image/jpeg")
    blob.make_public()
    return blob.public_url


def delete_existing_seed_posts():
    docs = db.collection("posts").stream()
    batch = db.batch()
    count = 0
    for doc in docs:
        if doc.id.startswith("seed-"):
            batch.delete(doc.reference)
            count += 1
    if count:
        batch.commit()
        print(f"Deleted {count} existing seed posts.")


def main():
    print(f"Seeding project: {PROJECT_ID}")
    delete_existing_seed_posts()

    photos = sorted(SEED_PHOTOS_DIR.glob("*.jpg")) + sorted(SEED_PHOTOS_DIR.glob("*.jpeg"))
    print(f"Found {len(photos)} seed photos.")

    for i, post_def in enumerate(SEED_POSTS):
        photo_url = ""
        if i < len(photos):
            print(f"  Uploading {photos[i].name}...")
            blob = bucket.blob(f"posts/seed-{photos[i].name}")
            blob.upload_from_filename(str(photos[i]), content_type="image/jpeg")
            blob.make_public()
            photo_url = blob.public_url

        post_id = post_def["postId_prefix"]
        doc_data = {
            "postId": post_id,
            "authorId": post_def["authorId"],
            "kind": post_def["kind"],
            "category": post_def["category"],
            "items": post_def["items"],
            "description": post_def["description"],
            "photoURL": photo_url,
            "location": post_def["location"],
            "status": "open",
            "matchedPostId": None,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        db.collection("posts").document(post_id).set(doc_data)
        print(f"  Created post: {post_id}")

    print("Seed complete.")


if __name__ == "__main__":
    main()
