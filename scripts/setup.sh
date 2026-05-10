#!/usr/bin/env bash
# Bridge full-stack setup + deploy
#
# Run this ONCE after you have:
#   1. Completed all browser steps in HUMAN_SETUP.md (A1-A7)
#   2. Run: gcloud auth login && gcloud auth application-default login && firebase login
#   3. Created bridge/backend/.env.local  (FIREBASE_PROJECT_ID + GEMINI_API_KEY)
#   4. Created bridge/frontend/.env.local (all VITE_FIREBASE_* values)
#
# Usage (from the bridge/ directory):
#   bash scripts/setup.sh
#
# What it does, in order:
#   1. Validates you have the .env.local files
#   2. Points gcloud + firebase CLI at your project
#   3. Enables all required GCP APIs
#   4. Deploys Firestore security rules + composite indexes
#   5. Sets Storage CORS headers
#   6. Deploys backend to Cloud Run
#   7. Builds + deploys frontend to Firebase Hosting
#   8. Prints the live URLs

set -euo pipefail

# ── 0. Must be run from bridge/ ──────────────────────────────────────────────
if [[ ! -f "firebase.json" ]]; then
  echo "ERROR: Run this from the bridge/ directory (the one containing firebase.json)."
  exit 1
fi

# ── 1. Load secrets ──────────────────────────────────────────────────────────
if [[ ! -f backend/.env.local ]]; then
  echo "ERROR: backend/.env.local not found."
  echo "  Copy backend/.env.example → backend/.env.local and fill in your values."
  exit 1
fi
if [[ ! -f frontend/.env.local ]]; then
  echo "ERROR: frontend/.env.local not found."
  echo "  Copy frontend/.env.example → frontend/.env.local and fill in your values."
  exit 1
fi

set -a; source backend/.env.local; set +a

: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID is missing from backend/.env.local}"
: "${GEMINI_API_KEY:?GEMINI_API_KEY is missing from backend/.env.local}"

echo "──────────────────────────────────────────────────────"
echo "  Bridge setup — project: $FIREBASE_PROJECT_ID"
echo "──────────────────────────────────────────────────────"

# ── 2. Point CLIs at the project ─────────────────────────────────────────────
echo ""
echo "[1/7] Configuring CLI project targets..."
gcloud config set project "$FIREBASE_PROJECT_ID"
firebase use "$FIREBASE_PROJECT_ID" --add 2>/dev/null || firebase use "$FIREBASE_PROJECT_ID"

# ── 3. Enable required GCP APIs ──────────────────────────────────────────────
echo ""
echo "[2/7] Enabling GCP APIs (this takes ~30 seconds)..."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  firebasestorage.googleapis.com \
  --project "$FIREBASE_PROJECT_ID"
echo "  APIs enabled."

# ── 4. Deploy Firestore rules + indexes ──────────────────────────────────────
echo ""
echo "[3/7] Deploying Firestore security rules and indexes..."
firebase deploy --only firestore --project "$FIREBASE_PROJECT_ID"
echo "  Firestore rules deployed."

# ── 5. Storage CORS ───────────────────────────────────────────────────────────
echo ""
echo "[4/7] Applying Storage CORS policy..."
BUCKET="${FIREBASE_PROJECT_ID}.appspot.com"
# Try .appspot.com first; fall back to .firebasestorage.app (newer projects)
if gsutil ls "gs://$BUCKET" >/dev/null 2>&1; then
  gsutil cors set storage.cors.json "gs://$BUCKET"
  echo "  CORS applied to gs://$BUCKET"
else
  BUCKET="${FIREBASE_PROJECT_ID}.firebasestorage.app"
  gsutil cors set storage.cors.json "gs://$BUCKET"
  echo "  CORS applied to gs://$BUCKET"
fi

# ── 6. Deploy backend ─────────────────────────────────────────────────────────
echo ""
echo "[5/7] Deploying backend to Cloud Run (first build takes ~3 minutes)..."
REGION="us-central1"
SERVICE="bridge-api"
gcloud run deploy "$SERVICE" \
  --source ./backend \
  --region "$REGION" \
  --project "$FIREBASE_PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.5-flash},GEMINI_API_KEY=$GEMINI_API_KEY"

BACKEND_URL=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --project "$FIREBASE_PROJECT_ID" \
  --format "value(status.url)")
echo "  Backend live at: $BACKEND_URL"

# ── 6b. Patch frontend/.env.local with the real backend URL ──────────────────
if grep -q "^VITE_BACKEND_URL=" frontend/.env.local; then
  # Update existing line (cross-platform sed trick)
  sed -i.bak "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=${BACKEND_URL}|" frontend/.env.local && rm -f frontend/.env.local.bak
else
  echo "VITE_BACKEND_URL=${BACKEND_URL}" >> frontend/.env.local
fi
echo "  frontend/.env.local updated with VITE_BACKEND_URL."

# ── 7. Deploy frontend ────────────────────────────────────────────────────────
echo ""
echo "[6/7] Building and deploying frontend to Firebase Hosting..."
(cd frontend && npm run build)
firebase deploy --only hosting --project "$FIREBASE_PROJECT_ID"

HOSTING_URL="https://${FIREBASE_PROJECT_ID}.web.app"
echo "  Frontend live at: $HOSTING_URL"

# ── 7b. Patch storage.cors.json with the real hosting URL ────────────────────
# Update the placeholder so re-running CORS apply uses the right origin
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' "s|https://YOUR_PROJECT_ID.web.app|${HOSTING_URL}|g" storage.cors.json
else
  sed -i "s|https://YOUR_PROJECT_ID.web.app|${HOSTING_URL}|g" storage.cors.json
fi
# Re-apply CORS now that the origin is correct
gsutil cors set storage.cors.json "gs://$BUCKET"
echo "  CORS re-applied with real Hosting origin."

# ── 8. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  SETUP COMPLETE"
echo ""
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $HOSTING_URL"
echo ""
echo "  ⚠  FINAL MANUAL STEP (takes 30 seconds):"
echo "  Add your hosting domain to Firebase Auth authorized domains:"
echo "  https://console.firebase.google.com/project/$FIREBASE_PROJECT_ID/authentication/settings"
echo "  → Authorized domains → Add domain → ${FIREBASE_PROJECT_ID}.web.app"
echo "══════════════════════════════════════════════════════"
