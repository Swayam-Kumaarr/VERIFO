from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Result
from schemas import BadgeOut, PortfolioOut

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _build_badges(payload: dict) -> list[dict]:
    badges: list[dict] = []
    for s in payload.get("skills") or []:
        badges.append({"category": "skill", "label": s.get("name", ""), "verified": True, "flagged": False})

    live_count = sum(1 for l in (payload.get("links_verified") or []) if l.get("live"))
    if live_count:
        badges.append({"category": "deployment", "label": f"{live_count} live link(s)", "verified": True, "flagged": False})

    for p in payload.get("projects") or []:
        if p.get("verified"):
            badges.append({"category": "project", "label": p.get("name", ""), "verified": True, "flagged": False})

    for f in payload.get("red_flags") or []:
        badges.append({"category": "flag", "label": f, "verified": False, "flagged": True})

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
        "user": payload.get("github_username") or payload.get("name", ""),
        "verified_at": payload.get("verified_at", ""),
        "authenticity_score": max(0, 100 - 10 * len(payload.get("red_flags") or [])),
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
