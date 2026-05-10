# Bridge full-stack setup + deploy (Windows PowerShell version)
#
# Run this ONCE after you have:
#   1. Completed all browser steps in HUMAN_SETUP.md (A1-A7)
#   2. Run in a terminal:
#        gcloud auth login
#        gcloud auth application-default login
#        firebase login
#   3. Created bridge\backend\.env.local  (FIREBASE_PROJECT_ID + GEMINI_API_KEY)
#   4. Created bridge\frontend\.env.local (all VITE_FIREBASE_* values)
#
# Usage (from the bridge\ directory in PowerShell):
#   .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

# ── 0. Must be run from bridge\ ──────────────────────────────────────────────
if (-not (Test-Path "firebase.json")) {
  Write-Error "Run this from the bridge\ directory (the one containing firebase.json)."
  exit 1
}

# ── 1. Load secrets ──────────────────────────────────────────────────────────
if (-not (Test-Path "backend\.env.local")) {
  Write-Error "backend\.env.local not found. Copy backend\.env.example and fill in your values."
  exit 1
}
if (-not (Test-Path "frontend\.env.local")) {
  Write-Error "frontend\.env.local not found. Copy frontend\.env.example and fill in your values."
  exit 1
}

# Parse .env.local into a hashtable
$envVars = @{}
Get-Content "backend\.env.local" | ForEach-Object {
  if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
  }
}

$PROJECT_ID  = $envVars["FIREBASE_PROJECT_ID"]
$GEMINI_KEY  = $envVars["GEMINI_API_KEY"]
$GEMINI_MODEL = if ($envVars["GEMINI_MODEL"]) { $envVars["GEMINI_MODEL"] } else { "gemini-2.5-flash" }

if (-not $PROJECT_ID) { Write-Error "FIREBASE_PROJECT_ID is missing from backend\.env.local"; exit 1 }
if (-not $GEMINI_KEY) { Write-Error "GEMINI_API_KEY is missing from backend\.env.local"; exit 1 }

Write-Host "──────────────────────────────────────────────────────"
Write-Host "  Bridge setup — project: $PROJECT_ID"
Write-Host "──────────────────────────────────────────────────────"

# ── 2. Point CLIs at the project ─────────────────────────────────────────────
Write-Host "`n[1/7] Configuring CLI project targets..."
gcloud config set project $PROJECT_ID
firebase use $PROJECT_ID

# ── 3. Enable required GCP APIs ──────────────────────────────────────────────
Write-Host "`n[2/7] Enabling GCP APIs (this takes ~30 seconds)..."
gcloud services enable `
  run.googleapis.com `
  firestore.googleapis.com `
  firebase.googleapis.com `
  identitytoolkit.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  storage.googleapis.com `
  firebasestorage.googleapis.com `
  --project $PROJECT_ID
Write-Host "  APIs enabled."

# ── 4. Deploy Firestore rules + indexes ──────────────────────────────────────
Write-Host "`n[3/7] Deploying Firestore security rules and indexes..."
firebase deploy --only firestore --project $PROJECT_ID
Write-Host "  Firestore rules deployed."

# ── 5. Storage CORS ───────────────────────────────────────────────────────────
Write-Host "`n[4/7] Applying Storage CORS policy..."
$BUCKET = "${PROJECT_ID}.firebasestorage.app"
gsutil cors set storage.cors.json "gs://$BUCKET"
Write-Host "  CORS applied to gs://$BUCKET"

# ── 6. Deploy backend ─────────────────────────────────────────────────────────
Write-Host "`n[5/7] Deploying backend to Cloud Run (first build ~3 minutes)..."
$REGION  = "us-central1"
$SERVICE = "bridge-api"
gcloud run deploy $SERVICE `
  --source .\backend `
  --region $REGION `
  --project $PROJECT_ID `
  --allow-unauthenticated `
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID,GEMINI_MODEL=$GEMINI_MODEL,GEMINI_API_KEY=$GEMINI_KEY"

$BACKEND_URL = gcloud run services describe $SERVICE `
  --region $REGION `
  --project $PROJECT_ID `
  --format "value(status.url)"
Write-Host "  Backend live at: $BACKEND_URL"

# Patch frontend/.env.local with the real backend URL
$envLocal = Get-Content "frontend\.env.local"
if ($envLocal -match "^VITE_BACKEND_URL=") {
  $envLocal = $envLocal -replace "^VITE_BACKEND_URL=.*", "VITE_BACKEND_URL=$BACKEND_URL"
  Set-Content "frontend\.env.local" $envLocal -Encoding utf8
} else {
  Add-Content "frontend\.env.local" "VITE_BACKEND_URL=$BACKEND_URL" -Encoding utf8
}
Write-Host "  frontend\.env.local updated with VITE_BACKEND_URL."

# ── 7. Deploy frontend ────────────────────────────────────────────────────────
Write-Host "`n[6/7] Building and deploying frontend to Firebase Hosting..."
Set-Location "frontend"
npm run build
Set-Location ".."
firebase deploy --only hosting --project $PROJECT_ID

$HOSTING_URL = "https://${PROJECT_ID}.web.app"
Write-Host "  Frontend live at: $HOSTING_URL"

# Re-apply CORS with the real Hosting origin
$corsContent = Get-Content "storage.cors.json" -Raw
$corsContent = $corsContent -replace "https://YOUR_PROJECT_ID\.web\.app", $HOSTING_URL
Set-Content "storage.cors.json" $corsContent -Encoding utf8
gsutil cors set storage.cors.json "gs://$BUCKET"
Write-Host "  CORS re-applied with real Hosting origin."

# ── 8. Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════════"
Write-Host "  SETUP COMPLETE"
Write-Host ""
Write-Host "  Backend:  $BACKEND_URL"
Write-Host "  Frontend: $HOSTING_URL"
Write-Host ""
Write-Host "  FINAL MANUAL STEP (30 seconds):"
Write-Host "  Add your Hosting domain to Firebase Auth authorized domains:"
Write-Host "  https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
Write-Host "  -> Authorized domains -> Add domain -> ${PROJECT_ID}.web.app"
Write-Host "══════════════════════════════════════════════════════"
