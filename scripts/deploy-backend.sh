#!/usr/bin/env bash
set -euo pipefail

if [[ -f backend/.env.local ]]; then
  set -a; source backend/.env.local; set +a
fi

: "${GEMINI_API_KEY:?GEMINI_API_KEY missing — fill it in backend/.env.local}"
: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID missing — fill it in backend/.env.local}"
: "${BRIDGE_ADMIN_KEY:?BRIDGE_ADMIN_KEY missing — generate a random secret and add to backend/.env.local}"

REGION="us-central1"
SERVICE="bridge-api"

gcloud run deploy "$SERVICE" \
  --source ./backend \
  --region "$REGION" \
  --project "$FIREBASE_PROJECT_ID" \
  --allow-unauthenticated \
  --cpu-throttling \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,GEMINI_MODEL=gemini-2.5-flash,GEMINI_API_KEY=$GEMINI_API_KEY,BRIDGE_ADMIN_KEY=$BRIDGE_ADMIN_KEY"

echo ""
echo "✓ Deployed. Set up Cloud Scheduler to call the expiry endpoint every 6 hours:"
echo "  gcloud scheduler jobs create http expire-bridge-posts \\"
echo "    --schedule='0 */6 * * *' \\"
echo "    --uri='https://<YOUR_CLOUD_RUN_URL>/api/v1/users/admin/expire-posts' \\"
echo "    --http-method=POST \\"
echo "    --headers='X-Admin-Key=$BRIDGE_ADMIN_KEY' \\"
echo "    --location=$REGION"
