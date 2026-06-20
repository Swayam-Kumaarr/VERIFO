import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)  # nullable for GitHub-only users
    name = Column(String, nullable=False)
    role = Column(String, default="developer")  # developer | client
    github_username = Column(String, nullable=True)
    github_token = Column(Text, nullable=True)
    github_avatar_url = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    email = Column(String, nullable=False)
    resume_text = Column(Text, nullable=True)
    github_url = Column(String, nullable=True)
    # stored as JSON strings
    _deployment_urls = Column("deployment_urls", Text, default="[]")
    _misc_links = Column("misc_links", Text, default="[]")
    misc_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def deployment_urls(self):
        return json.loads(self._deployment_urls or "[]")

    @deployment_urls.setter
    def deployment_urls(self, value):
        self._deployment_urls = json.dumps(value or [])

    @property
    def misc_links(self):
        return json.loads(self._misc_links or "[]")

    @misc_links.setter
    def misc_links(self, value):
        self._misc_links = json.dumps(value or [])


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String, primary_key=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    status = Column(String, default="pending")  # pending | running | done | failed
    current_step = Column(Integer, default=0)   # 0-5
    step_label = Column(String, nullable=True)
    _step_logs = Column("step_logs", Text, default="{}")
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def step_logs(self):
        return json.loads(self._step_logs or "{}")

    @step_logs.setter
    def step_logs(self, value):
        self._step_logs = json.dumps(value or {})


class Result(Base):
    __tablename__ = "results"

    id = Column(String, primary_key=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    analysis_run_id = Column(String, ForeignKey("analysis_runs.id"), nullable=False)
    _payload = Column("payload", Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def payload(self):
        return json.loads(self._payload)

    @payload.setter
    def payload(self, value):
        self._payload = json.dumps(value)
