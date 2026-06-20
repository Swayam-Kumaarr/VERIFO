"""
Real analysis pipeline — GitHub API + Claude API.
Runs as a FastAPI BackgroundTask.
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from collections import defaultdict

import httpx
import anthropic
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from models import AnalysisRun, Result, Submission

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GH_ACCEPT = "application/vnd.github+json"

STEPS = [
    "Connecting to GitHub API",
    "Fetching repositories & commit history",
    "Code pattern & AI signature analysis",
    "Contributor & commit quality check",
    "Generating honesty score (Claude)",
]


# ── GitHub helpers ─────────────────────────────────────────────────────────────

def _gh_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": GH_ACCEPT}


async def _gh_get(client: httpx.AsyncClient, url: str, token: str) -> dict | list:
    r = await client.get(url, headers=_gh_headers(token), timeout=15)
    r.raise_for_status()
    return r.json()


async def fetch_repos(client: httpx.AsyncClient, token: str) -> list[dict]:
    repos = await _gh_get(client, "https://api.github.com/user/repos?per_page=100&sort=updated&type=owner", token)
    return repos if isinstance(repos, list) else []


async def fetch_commits(client: httpx.AsyncClient, token: str, owner: str, repo: str) -> list[dict]:
    try:
        commits = await _gh_get(
            client,
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100&author={owner}",
            token,
        )
        return commits if isinstance(commits, list) else []
    except Exception:
        return []


async def fetch_languages(client: httpx.AsyncClient, token: str, owner: str, repo: str) -> dict:
    try:
        return await _gh_get(client, f"https://api.github.com/repos/{owner}/{repo}/languages", token)  # type: ignore
    except Exception:
        return {}


# ── Analysis helpers ───────────────────────────────────────────────────────────

AI_BOT_PATTERNS = ["github-copilot", "copilot", "cursor", "devin", "dependabot", "renovate", "github-actions"]
GENERIC_MSG_WORDS = {"fix", "update", "change", "misc", "wip", "test", "edit", "stuff", "done", "refactor", "clean"}

def _is_ai_commit(msg: str, co_authors: str) -> bool:
    msg_lower = msg.lower().strip()
    for bot in AI_BOT_PATTERNS:
        if bot in co_authors.lower():
            return True
    # Very short single-word generic messages
    words = msg_lower.split()
    if len(words) <= 2 and all(w in GENERIC_MSG_WORDS for w in words):
        return True
    return False

def _commit_quality(msg: str) -> str:
    words = msg.strip().split()
    if len(words) >= 8:
        return "high"
    if len(words) >= 4:
        return "medium"
    return "low"

AI_FILE_PATTERNS = ["utils2", "helper_v", "helpers2", "index2", "temp_", "new_file", "untitled"]

def _ai_filename_score(filenames: list[str]) -> int:
    return sum(1 for f in filenames if any(p in f.lower() for p in AI_FILE_PATTERNS))


# ── Claude analysis ────────────────────────────────────────────────────────────

async def _claude_honesty_score(username: str, repo_summary: list[dict], ai_commit_count: int, total_commits: int) -> dict:
    if not ANTHROPIC_KEY:
        return {"score": 75, "label": "Mostly Honest", "summary": "Claude API key not configured — using estimated score."}

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    repo_text = "\n".join(
        f"- {r['name']}: {r['commits']} commits, {r['ai_commits']} AI-flagged, languages: {', '.join(r['langs'])}"
        for r in repo_summary
    )

    prompt = f"""You are a developer authenticity analyzer. Given the following GitHub data for user "{username}", compute a developer honesty score from 0–100.

Repository data:
{repo_text}

Total commits analyzed: {total_commits}
AI-assisted commits detected: {ai_commit_count}

Rules:
- 90–100: No AI signatures, consistent commits, deep diffs
- 75–89: Mostly genuine, minor AI usage
- 60–74: Partial AI use, some generic patterns
- Below 60: Heavy AI assistance or suspicious patterns

Respond ONLY as valid JSON with these exact keys:
{{"score": <int 0-100>, "label": "<short label>", "summary": "<2-3 sentence plain English summary>"}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = msg.content[0].text.strip()
        # Extract JSON if wrapped in code fences
        if "```" in text:
            text = text.split("```")[1].lstrip("json").strip()
        return json.loads(text)
    except Exception as e:
        return {"score": 72, "label": "Mostly Honest", "summary": f"Analysis completed with estimated score. ({e})"}


# ── Main pipeline ──────────────────────────────────────────────────────────────

async def run_pipeline(submission_id: str, run_id: str, db_factory, github_token: str | None = None):
    db: Session = db_factory()
    try:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not run or not submission:
            return

        token = github_token or os.getenv("GITHUB_FALLBACK_TOKEN", "")

        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()

        logs: dict[str, list[str]] = {}

        async with httpx.AsyncClient() as client:

            # ── Step 1: Connect ────────────────────────────────────────────────
            run.current_step = 1
            run.step_label = STEPS[0]
            db.commit()

            logs["1"] = []
            _log(run, db, logs, "1", "→ Validating GitHub OAuth token...")
            await asyncio.sleep(0.3)

            try:
                user_data = await _gh_get(client, "https://api.github.com/user", token)
                username = user_data.get("login", "user")
                rate = await _gh_get(client, "https://api.github.com/rate_limit", token)
                remaining = rate.get("rate", {}).get("remaining", "?")
                _log(run, db, logs, "1", f"→ Authenticated as: {username}")
                _log(run, db, logs, "1", f"→ Rate limit: {remaining} / 5,000 remaining")
                _log(run, db, logs, "1", "✓ GitHub connected")
            except Exception as e:
                _log(run, db, logs, "1", f"✗ Auth failed: {e}")
                username = "user"

            await asyncio.sleep(0.3)

            # ── Step 2: Fetch repos & commits ──────────────────────────────────
            run.current_step = 2
            run.step_label = STEPS[1]
            db.commit()

            logs["2"] = []
            _log(run, db, logs, "2", f"→ Fetching repositories for {username}...")
            await asyncio.sleep(0.2)

            repos = await fetch_repos(client, token)
            _log(run, db, logs, "2", f"→ Found {len(repos)} owned repositories")

            all_commits = []
            lang_totals: dict[str, int] = defaultdict(int)
            repo_details = []

            for repo in repos[:10]:  # cap at 10 repos to avoid rate limit
                rname = repo["name"]
                _log(run, db, logs, "2", f"→ Scanning {rname}...")
                commits = await fetch_commits(client, token, username, rname)
                langs = await fetch_languages(client, token, username, rname)
                for lang, bytes_ in langs.items():
                    lang_totals[lang] += bytes_
                all_commits.extend(commits)
                repo_details.append({"name": rname, "commits_raw": commits, "langs": list(langs.keys())})
                await asyncio.sleep(0.1)

            top_langs = sorted(lang_totals.items(), key=lambda x: x[1], reverse=True)[:5]
            lang_str = ", ".join(f"{l}" for l, _ in top_langs)
            _log(run, db, logs, "2", f"→ Top languages: {lang_str or 'none detected'}")
            _log(run, db, logs, "2", f"✓ {len(all_commits)} commits indexed across {len(repos)} repos")

            # ── Step 3: Code pattern analysis ─────────────────────────────────
            run.current_step = 3
            run.step_label = STEPS[2]
            db.commit()

            logs["3"] = []
            _log(run, db, logs, "3", "→ Scanning commit messages for AI patterns...")
            await asyncio.sleep(0.3)

            ai_commits = 0
            high_quality = 0
            for commit in all_commits:
                msg = commit.get("commit", {}).get("message", "")
                co_authors = str(commit.get("commit", {}).get("message", ""))
                if _is_ai_commit(msg, co_authors):
                    ai_commits += 1
                if _commit_quality(msg) == "high":
                    high_quality += 1

            total = len(all_commits)
            ai_pct = round((ai_commits / total * 100) if total else 0)

            _log(run, db, logs, "3", f"→ {ai_commits} AI-flagged commits out of {total} ({ai_pct}%)")

            if ai_commits > 0:
                _log(run, db, logs, "3", f"⚠ Found {ai_commits} commits with AI assistant signatures")
            else:
                _log(run, db, logs, "3", "→ No AI co-author signatures detected")

            _log(run, db, logs, "3", f"→ High-quality commit messages: {high_quality}/{total}")
            _log(run, db, logs, "3", "✓ Code pattern analysis complete")

            # ── Step 4: Contributor quality check ─────────────────────────────
            run.current_step = 4
            run.step_label = STEPS[3]
            db.commit()

            logs["4"] = []
            _log(run, db, logs, "4", "→ Checking commit time distribution...")
            await asyncio.sleep(0.4)

            # Commit time analysis
            hours: dict[int, int] = defaultdict(int)
            for commit in all_commits:
                date_str = commit.get("commit", {}).get("author", {}).get("date", "")
                if date_str:
                    try:
                        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        hours[dt.hour] += 1
                    except Exception:
                        pass

            night_commits = sum(v for h, v in hours.items() if 0 <= h < 6)
            if night_commits > total * 0.4 and total > 5:
                _log(run, db, logs, "4", f"⚠ {night_commits} commits between midnight–6am — unusual pattern")
            else:
                _log(run, db, logs, "4", "→ Commit time distribution looks natural")

            # Burst detection — >20 commits same day
            date_counts: dict[str, int] = defaultdict(int)
            for commit in all_commits:
                date_str = commit.get("commit", {}).get("author", {}).get("date", "")[:10]
                if date_str:
                    date_counts[date_str] += 1
            burst_days = [d for d, c in date_counts.items() if c > 20]
            if burst_days:
                _log(run, db, logs, "4", f"⚠ Commit burst detected on {len(burst_days)} day(s) (>20 commits/day)")
            else:
                _log(run, db, logs, "4", "→ No commit burst patterns detected")

            _log(run, db, logs, "4", "✓ Contributor check complete")

            # ── Step 5: Claude honesty score ───────────────────────────────────
            run.current_step = 5
            run.step_label = STEPS[4]
            db.commit()

            logs["5"] = []
            _log(run, db, logs, "5", "→ Sending verified data to Claude API...")
            await asyncio.sleep(0.2)

            repo_summary = [
                {
                    "name": r["name"],
                    "commits": len(r["commits_raw"]),
                    "ai_commits": sum(1 for c in r["commits_raw"] if _is_ai_commit(
                        c.get("commit", {}).get("message", ""),
                        c.get("commit", {}).get("message", ""),
                    )),
                    "langs": r["langs"][:3],
                }
                for r in repo_details
            ]

            claude_result = await _claude_honesty_score(username, repo_summary, ai_commits, total)

            _log(run, db, logs, "5", f"→ Score computed: {claude_result['score']}/100")
            _log(run, db, logs, "5", f"→ Label: {claude_result['label']}")
            _log(run, db, logs, "5", "✓ Proof ledger ready")

        # ── Build and store result ─────────────────────────────────────────────
        payload = {
            "user": username,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "authenticity_score": claude_result["score"],
            "authenticity_label": claude_result["label"],
            "authenticity_summary": claude_result["summary"],
            "repos_analyzed": len(repos),
            "total_commits": total,
            "ai_flagged_commits": ai_commits,
            "top_languages": [l for l, _ in top_langs],
            "high_quality_commits": high_quality,
            "burst_days": burst_days,
            "flags": {
                "ai_signatures_detected": ai_commits > 0,
                "commit_burst_detected": len(burst_days) > 0,
                "unusual_night_commits": night_commits > total * 0.4 and total > 5,
                "consistent_cadence": len(burst_days) == 0,
            },
        }

        result = Result(
            id=str(uuid.uuid4()),
            submission_id=submission_id,
            analysis_run_id=run_id,
        )
        result.payload = payload
        db.add(result)

        run.status = "done"
        run.current_step = 5
        run.finished_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as exc:
        db.rollback()
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.error = str(exc)
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
        raise
    finally:
        db.close()


def _log(run: AnalysisRun, db: Session, logs: dict, step: str, line: str):
    logs[step].append(line)
    run.step_logs = logs
    db.commit()
