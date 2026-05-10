# Bridge

**Live: https://helper-495902.web.app**

Bridge connects people who have surplus food and clothing with people in their community who need it — and gets it there through volunteer drivers. No middleman, no waiting list, no bureaucracy.

---

## The Problem

Food banks and donation centres have friction on both sides. People with surplus don't bother because drop-off is inconvenient. People in need don't go because it's far, or embarrassing, or the hours don't work. The result is a lot of waste sitting next to a lot of need, with nothing connecting them.

Bridge makes posting a surplus bag of groceries as easy as taking a photo, and requesting help as easy as tapping a category.

---

## How It Works

Three roles, one flow:

**Helper** — you have stuff to give. Take a photo, Bridge scans it with Gemini Vision and auto-fills the item list. Post it. Done.

**Person in need** — browse nearby offers or post what you're looking for. Claim items from an offer, or wait for a helper to match your request.

**Driver** — pick up available deliveries from the app and drop them off. No signing up, no scheduling. Just open the app and accept a job.

Once a match is made between a helper and someone in need, the app arranges a driver, tracks the delivery in real time with a countdown timer, and opens a chat between all three parties so they can coordinate without sharing phone numbers.

---

## AI

The main AI feature is **Gemini Vision photo intake**. Instead of manually listing items, helpers photograph whatever they're donating — a shelf, a bag, a box — and Gemini returns a structured list: item names, quantities, sizes where relevant. That list gets attached to the post and shown to potential recipients before they claim anything.

This was the biggest UX unlock. Typing out "3x canned tomatoes, 1x pasta, 2x cereal" is the kind of friction that kills a donation before it happens.

---

## Technical Highlights

- **Real-time everything** — Firestore `onSnapshot` listeners mean delivery status, chat messages, and new posts update instantly across all connected clients without polling
- **Three-query merge pattern** — Firestore doesn't support OR across different fields. The chat sidebar fetches matches where the user is helper, needy person, *or* driver using three parallel queries merged client-side into a single deduplicated list
- **Composite index avoidance** — queries that combine `where()` on one field with `orderBy()` on another require manually created Firestore composite indexes. Where possible, we drop `orderBy` from the query and sort results client-side to keep deployment zero-config
- **Partial delivery tracking** — a post can have 10 items and only 3 get matched and delivered. The backend checks remaining unclaimed quantities on delivery and marks posts `partially_delivered` vs `delivered` accordingly, keeping the remaining items visible and claimable
- **OSRM routing** — real driving routes rendered on the map between pickup and dropoff, no API key required
- **Nominatim geocoding** — forward and reverse geocoding for address lookup and display, also free and keyless
- **createPortal for z-index isolation** — the chat drawer is rendered at `document.body` level via React portal so it escapes the sticky header's stacking context and always appears on top
- **Write ordering for consistency** — the claim endpoint creates the match document first, then updates post item quantities. If the match write fails, nothing is left in a broken state. The original code did this backwards and caused items to get stuck as "claimed" with no matching match document

---

## Stack

| | |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | FastAPI on Cloud Run (Python 3.11) |
| Database | Firestore |
| Auth | Firebase Auth (Google sign-in) |
| Storage | Firebase Storage |
| AI | Gemini Vision (`gemini-2.5-flash`) |
| Maps | Leaflet + react-leaflet |
| Routing | OSRM (open source, no key) |
| Geocoding | Nominatim (open source, no key) |
| Hosting | Firebase Hosting |
