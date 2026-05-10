from fastapi import APIRouter, Depends, HTTPException
from models import ParsePhotoBody
from deps import get_current_user
from services import gemini

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse-photo")
async def parse_photo(body: ParsePhotoBody, user=Depends(get_current_user)):
    try:
        result = gemini.parse_photo(body.photo_url, body.kind)
        return result
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
