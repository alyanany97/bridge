#!/usr/bin/env bash
set -euo pipefail

if [[ -f backend/.env.local ]]; then
  set -a; source backend/.env.local; set +a
fi
: "${GEMINI_API_KEY:?GEMINI_API_KEY missing — fill it in backend/.env.local}"
: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID missing — fill it in backend/.env.local}"

REGION="us-central1"
SERVICE="bridge-api"

gcloud run deploy "$SERVICE" \
  --source ./backend \
  --region "$REGION" \
  --project "$FIREBASE_PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,GEMINI_MODEL=gemini-2.5-flash,GEMINI_API_KEY=$GEMINI_API_KEY"
