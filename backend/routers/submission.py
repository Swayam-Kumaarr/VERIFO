import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Submission
from schemas import SubmissionCreate, SubmissionOut, SubmissionPatch

router = APIRouter(prefix="/api/submission", tags=["submission"])


def _row_to_out(s: Submission) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "age": s.age,
        "email": s.email,
        "resume_text": s.resume_text,
        "github_url": s.github_url,
        "deployment_urls": s.deployment_urls,
        "misc_links": s.misc_links,
        "misc_notes": s.misc_notes,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }


@router.post("/create", response_model=SubmissionOut, status_code=201)
def create_submission(body: SubmissionCreate, db: Session = Depends(get_db)):
    sub = Submission(id=str(uuid.uuid4()), **body.model_dump(exclude={"deployment_urls", "misc_links"}))
    sub.deployment_urls = body.deployment_urls
    sub.misc_links = body.misc_links
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _row_to_out(sub)


@router.get("/{submission_id}", response_model=SubmissionOut)
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")
    return _row_to_out(sub)


@router.patch("/{submission_id}", response_model=SubmissionOut)
def patch_submission(submission_id: str, body: SubmissionPatch, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")

    data = body.model_dump(exclude_none=True)
    for key in ("deployment_urls", "misc_links"):
        if key in data:
            setattr(sub, key, data.pop(key))
    for key, val in data.items():
        setattr(sub, key, val)

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)
    return _row_to_out(sub)
