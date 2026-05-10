import os
from dotenv import load_dotenv

load_dotenv(".env.local")

import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import posts, matches, ai

if not firebase_admin._apps:
    firebase_admin.initialize_app()

app = FastAPI(title="Bridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://helper-495902.web.app",
        "https://helper-495902.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router)
app.include_router(matches.router)
app.include_router(ai.router)


@app.get("/health")
async def health():
    return {"ok": True}
