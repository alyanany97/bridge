# Bridge

A peer-to-peer mutual aid app built for a hackathon. People post what they have (food, clothing) or what they need, helpers claim items, and volunteer drivers handle the last-mile delivery. There's also a group chat and private chats between each pair so nobody has to share phone numbers.

**Live:** https://helper-495902.web.app

---

## How it works

Three roles:

- **Needy** — post a request for food or clothing, or browse offers and claim what you need
- **Helper** — post surplus items you want to give away, or accept someone's request
- **Driver** — pick up available deliveries and drop them off

A photo of your stuff gets run through Gemini Vision to auto-fill the item list so you don't have to type everything out manually.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui |
| Backend | FastAPI (Python 3.11), Cloud Run |
| Database | Firestore (real-time) |
| Auth | Firebase Auth (Google sign-in) |
| Storage | Firebase Storage |
| AI | Gemini Vision (photo → structured item list) |
| Maps | Leaflet + OSRM (no API key needed) |
| Geocoding | Nominatim (no API key needed) |

---

## Self-hosting

### Step 1 — Browser setup (~15 min, one-time)

| # | Where | What |
|---|---|---|
| 1 | [console.cloud.google.com](https://console.cloud.google.com) | Create a GCP project + link billing. Save the Project ID. |
| 2 | [console.firebase.google.com](https://console.firebase.google.com) | Add project → pick your GCP project → skip Analytics. |
| 3 | Firebase Console → `</>` icon | Register web app `bridge-web` → copy the `firebaseConfig` object. |
| 4 | Firebase → Authentication → Google | Enable Google sign-in, set support email. |
| 5 | Firebase → Firestore Database | Create database → Production mode → `us-central1`. |
| 6 | Firebase → Storage | Get started → Production mode → same region. |
| 7 | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Create an API key scoped to your project. Save it. |

### Step 2 — Authenticate CLIs

```bash
gcloud auth login
gcloud auth application-default login
firebase login
```

### Step 3 — Create your env files

**`backend/.env.local`** — don't commit this:
```
FIREBASE_PROJECT_ID=your-project-id
GEMINI_API_KEY=AIza-your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

**`frontend/.env.local`** — don't commit this either:
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
VITE_BACKEND_URL=http://localhost:8080
```

The setup script will overwrite `VITE_BACKEND_URL` with the real Cloud Run URL automatically.

### Step 4 — Deploy

From the `bridge/` directory:

```bash
# Mac/Linux/Git Bash
bash scripts/setup.sh

# Windows PowerShell
.\scripts\setup.ps1
```

This will:
- Point your CLIs at the right project
- Enable all required GCP APIs
- Deploy Firestore rules and indexes
- Set Storage CORS headers
- Build and deploy the backend to Cloud Run
- Patch `frontend/.env.local` with the Cloud Run URL
- Build and deploy the frontend to Firebase Hosting

### Step 5 — Add your hosting domain to Firebase Auth

Firebase Console → Authentication → Settings → Authorized domains → Add `your-project-id.web.app`

---

## Local dev

```bash
# Backend
cd backend
uvicorn main:app --reload --port 8080

# Frontend (new terminal)
cd frontend
npm run dev
```

After running the setup script, `frontend/.env.local` points at Cloud Run. Change `VITE_BACKEND_URL` back to `http://localhost:8080` if you want to run the backend locally.

## Re-deploying after changes

```bash
# Backend only
bash scripts/deploy-backend.sh

# Frontend only
bash scripts/deploy-frontend.sh

# Both
bash scripts/deploy-backend.sh && bash scripts/deploy-frontend.sh
```

## Seed data

Drop `.jpg`/`.jpeg` files into `seed-photos/` then run:

```bash
PROJECT_ID=your-project-id python scripts/seed.py
```
