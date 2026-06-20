from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Result
from schemas import BadgeOut, PortfolioOut

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _build_badges(payload: dict) -> list[dict]:
    badges = []
    skill_tags = payload.get("skill_tags", {})
    flags = payload.get("flags", {})

    for lang in skill_tags.get("languages", []):
        badges.append({"category": "language", "label": lang, "verified": True, "flagged": False})
    for fw in skill_tags.get("frameworks", []):
        badges.append({"category": "framework", "label": fw, "verified": True, "flagged": False})
    for skill in skill_tags.get("verified", []):
        badges.append({"category": "skill", "label": skill, "verified": True, "flagged": False})
    for ai in (skill_tags.get("flagged_ai_assisted") or []):
        if ai:
            badges.append({"category": "ai-assisted", "label": ai, "verified": False, "flagged": True})

    if flags.get("deployments_live", 0) > 0:
        badges.append({"category": "deployment", "label": f"{flags['deployments_live']} live deployment(s) verified", "verified": True, "flagged": False})
    if flags.get("consistent_commit_cadence"):
        badges.append({"category": "pattern", "label": "Consistent commit cadence", "verified": True, "flagged": False})
    if flags.get("no_copy_paste_spikes"):
        badges.append({"category": "pattern", "label": "No copy-paste spikes", "verified": True, "flagged": False})

    return badges


@router.get("/{submission_id}", response_model=PortfolioOut)
def get_portfolio(submission_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(Result)
        .filter(Result.submission_id == submission_id)
        .order_by(Result.created_at.desc())
        .first()
    )
    if not result:
        raise HTTPException(404, "Portfolio not ready — analysis may still be running")

    payload = result.payload
    return {
        "submission_id": submission_id,
        "user": payload.get("user", ""),
        "verified_at": payload.get("verified_at", ""),
        "authenticity_score": payload.get("authenticity_score", 0),
        "repositories": payload.get("projects", []),
        "badges": _build_badges(payload),
    }


@router.get("/{submission_id}/badges", response_model=list[BadgeOut])
def get_badges(submission_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(Result)
        .filter(Result.submission_id == submission_id)
        .order_by(Result.created_at.desc())
        .first()
    )
    if not result:
        raise HTTPException(404, "Portfolio not ready")
    return _build_badges(result.payload)
