# Bridge

**Live: https://helper-495902.web.app**

Bridge connects people with surplus food and clothing to people nearby who need it, with volunteer drivers handling delivery. Built for a hackathon.

---

## The Problem

Food banks have friction on both sides. People with extra stuff don't bother donating because drop-off is inconvenient. People in need don't always have transportation to get there. So a lot of waste sits next to a lot of need with nothing in between.

Existing solutions rely on centralized infrastructure, fixed hours, and people going out of their way. We wanted something that works with whatever's already around you.

---

## What We Built

A peer-to-peer app where neighbours help neighbours. Post what you have, claim what you need, a volunteer driver picks it up and drops it off. No middleman, no waiting room.

Three roles keep it simple: helpers post donations, people in need browse or request items, and drivers accept nearby deliveries on demand. Once a match is made, everyone gets a live delivery tracker and a shared chat so nobody has to share phone numbers.

---

## AI

The biggest barrier to donating is the effort of listing what you have. Nobody wants to type out a pantry.

Helpers just take a photo of whatever they're donating and Gemini Vision (`gemini-2.5-flash`) does the rest. It reads the image and returns a structured list of items with names, quantities, and sizes automatically. That list gets shown to anyone browsing nearby offers before they claim anything.

It turns a 2-minute chore into a 10-second photo.

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
| Maps | Leaflet + OSRM |
| Geocoding | Nominatim |
| Hosting | Firebase Hosting |
