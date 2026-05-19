from fastapi import APIRouter, Depends, HTTPException, Request

from models import ParsePhotoBody
from deps import get_current_user
from rate_limiter import limiter
from services import gemini

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse-photo")
@limiter.limit("10/minute")
async def parse_photo(
    request: Request,
    body: ParsePhotoBody,
    user: dict = Depends(get_current_user),
):
    try:
        result = gemini.parse_photo(body.photo_url, body.kind)
        return result
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
