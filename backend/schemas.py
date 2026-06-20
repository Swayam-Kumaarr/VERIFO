from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, HttpUrl


# ── Submission ─────────────────────────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    name: str
    age: int | None = None
    email: str
    resume_text: str | None = None
    github_url: str | None = None
    deployment_urls: list[str] = []
    misc_links: list[str] = []
    misc_notes: str | None = None


class SubmissionPatch(BaseModel):
    name: str | None = None
    age: int | None = None
    email: str | None = None
    resume_text: str | None = None
    github_url: str | None = None
    deployment_urls: list[str] | None = None
    misc_links: list[str] | None = None
    misc_notes: str | None = None


class SubmissionOut(BaseModel):
    id: str
    name: str
    age: int | None
    email: str
    resume_text: str | None
    github_url: str | None
    deployment_urls: list[str]
    misc_links: list[str]
    misc_notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Analysis ───────────────────────────────────────────────────────────────────

class AnalysisStatusOut(BaseModel):
    id: str
    submission_id: str
    status: str
    current_step: int
    step_label: str | None
    step_logs: list[str]
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None

    class Config:
        from_attributes = True


# ── Result ─────────────────────────────────────────────────────────────────────

class ResultOut(BaseModel):
    id: str
    submission_id: str
    analysis_run_id: str
    payload: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Portfolio ──────────────────────────────────────────────────────────────────

class BadgeOut(BaseModel):
    category: str
    label: str
    verified: bool
    flagged: bool = False


class PortfolioOut(BaseModel):
    submission_id: str
    user: str
    verified_at: str
    authenticity_score: int
    repositories: list[dict[str, Any]]
    badges: list[BadgeOut]
