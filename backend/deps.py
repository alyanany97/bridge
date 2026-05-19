from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

bearer = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(bearer),
) -> dict:
    """
    Verify Firebase JWT and return user info.
    Role comes from custom claims (set at onboarding) — zero extra Firestore reads.
    """
    try:
        decoded = auth.verify_id_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", ""),
        "name": decoded.get("name", ""),
        # Custom claim — set server-side during onboarding, never client-writable
        "role": decoded.get("role"),
    }


def require_role(*roles: str):
    """Raises 403 unless the user's JWT role claim is in `roles`."""
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _check
