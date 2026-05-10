from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

bearer = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(bearer),
) -> dict:
    try:
        decoded = auth.verify_id_token(creds.credentials)
        return {"uid": decoded["uid"], "email": decoded.get("email", "")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
