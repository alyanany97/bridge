# Bridge

**Live: https://helper-495902.web.app**

Bridge connects people with surplus food and clothing to people nearby who need it, with volunteer drivers handling delivery. Built for a hackathon.

---

## The Problem

Food banks have friction on both sides. People with extra stuff don't bother donating because drop-off is inconvenient. People in need don't always have a way to get there. So a lot of waste sits next to a lot of need with nothing connecting them.

Bridge cuts that out. Post what you have, claim what you need, a driver picks it up.

---

## How It Works

Three roles:

**Helper** - take a photo of what you're donating. Gemini scans it and fills in the item list automatically. Post it.

**Person in need** - browse nearby offers or post a request. Claim items, wait for a match.

**Driver** - open the app, accept an available delivery, drop it off. No scheduling required.

Once a match is made, the app finds a driver, tracks the delivery with a live countdown, and opens a group chat between all three people so nobody has to share phone numbers.

---

## AI

Helpers photograph whatever they're donating and Gemini Vision (`gemini-2.5-flash`) returns a structured item list with names, quantities, and sizes. No typing required.

This was the biggest UX unlock. Manually listing items is the kind of friction that kills a donation before it happens.

---

## Technical Highlights

- **Real-time updates** via Firestore `onSnapshot` across delivery status, chat, and new posts
- **Three-query merge pattern** to work around Firestore's lack of OR queries across different fields (helper/needy/driver are three separate queries merged client-side)
- **Partial delivery tracking** - a post with 10 items where only 3 get delivered gets marked `partially_delivered`, keeping the rest claimable
- **Write ordering for consistency** - match document is created before post items are updated, so a failed write never leaves items stuck as claimed with no match
- **React portal for the chat drawer** so it escapes the sticky header stacking context and always renders on top
- **OSRM + Nominatim** for routing and geocoding, both open source and keyless

---

## Stack

| | |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | FastAPI on Cloud Run (Python 3.11) |
| Database | Firestore |
| Auth | Firebase Auth (Google sign-in) |
| Storage | Firebase Storage |
| AI | Gemini Vision (gemini-2.5-flash) |
| Maps | Leaflet + react-leaflet |
| Routing | OSRM |
| Geocoding | Nominatim |
| Hosting | Firebase Hosting |
