import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import AnalysisRun, Submission
from schemas import AnalysisStatusOut
from services.pipeline import run_pipeline

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


def _row_to_out(run: AnalysisRun) -> dict:
    return {
        "id": run.id,
        "submission_id": run.submission_id,
        "status": run.status,
        "current_step": run.current_step,
        "step_label": run.step_label,
        "step_logs": run.step_logs,
        "error": run.error,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
    }


@router.post("/{submission_id}", response_model=AnalysisStatusOut, status_code=202)
def start_analysis(
    submission_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")

    # Prevent duplicate runs
    existing = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.submission_id == submission_id, AnalysisRun.status.in_(["pending", "running"]))
        .first()
    )
    if existing:
        return _row_to_out(existing)

    run = AnalysisRun(
        id=str(uuid.uuid4()),
        submission_id=submission_id,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_pipeline, submission_id, run.id, SessionLocal)
    return _row_to_out(run)


@router.get("/{submission_id}/status", response_model=AnalysisStatusOut)
def get_status(submission_id: str, db: Session = Depends(get_db)):
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.submission_id == submission_id)
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )
    if not run:
        raise HTTPException(404, "No analysis run found for this submission")
    return _row_to_out(run)
