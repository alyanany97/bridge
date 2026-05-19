from fastapi import APIRouter, Depends, HTTPException, Request

from models import ParsePhotoBody
from deps import get_current_user
from rate_limiter import limiter
from services import gemini, vision

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse-photo")
@limiter.limit("10/minute")
async def parse_photo(
    request: Request,
    body: ParsePhotoBody,
    user: dict = Depends(get_current_user),
):
    try:
        # Moderate before processing — raises ValueError for inappropriate content
        vision.check_safe_search(body.photo_url)
        result = gemini.parse_photo(body.photo_url, body.kind)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
