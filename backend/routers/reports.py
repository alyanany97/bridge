from fastapi import APIRouter, Depends, Request
from deps import get_current_user
from rate_limiter import limiter
from models import ReportBody
from services import firestore_repo

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("")
@limiter.limit("10/minute")
async def submit_report(
    request: Request,
    body: ReportBody,
    user: dict = Depends(get_current_user),
):
    report_id = firestore_repo.create_report(
        reporter_uid=user["uid"],
        target_type=body.target_type,
        target_id=body.target_id,
        reason=body.reason,
        details=body.details,
    )
    return {"ok": True, "reportId": report_id}
