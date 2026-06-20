"""
Agent loop pipeline — OpenRouter (OpenAI SDK) + GitHub API + live deployment checks.

The agent receives the submission, then picks tools to investigate GitHub repos,
verify deployments, and read misc links. It finishes by calling `finalize_resume`
which produces the structured "real resume" payload that gets stored.
"""

import asyncio
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from models import AnalysisRun, Result, Submission

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
GITHUB_PAT = os.getenv("GITHUB_PAT", "")
MODEL = "nex-agi/nex-n2-pro:free"
MAX_ITERATIONS = 15
GH_ACCEPT = "application/vnd.github+json"


# ── Tool definitions ──────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_repos",
            "description": "List GitHub repos owned by a username. Returns name, description, primary language, stars, updated_at, html_url for up to 30 repos.",
            "parameters": {
                "type": "object",
                "properties": {"username": {"type": "string"}},
                "required": ["username"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_repo",
            "description": "Get full details for one repo: languages breakdown, README content, topics, default branch.",
            "parameters": {
                "type": "object",
                "properties": {"owner": {"type": "string"}, "repo": {"type": "string"}},
                "required": ["owner", "repo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_commits",
            "description": "List recent commits authored by `author` in a repo (up to 30). Use to verify the user actually wrote the code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "author": {"type": "string", "description": "GitHub username to filter by"},
                },
                "required": ["owner", "repo", "author"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_file_tree",
            "description": "List top-level files and folders for a repo to understand its structure.",
            "parameters": {
                "type": "object",
                "properties": {"owner": {"type": "string"}, "repo": {"type": "string"}},
                "required": ["owner", "repo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read up to 8KB of a file in a repo. Useful for README, package.json, requirements.txt, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "path": {"type": "string"},
                },
                "required": ["owner", "repo", "path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_deployment",
            "description": "Verify a deployment URL is live. Returns status_code, response_ms, title, and a content snippet.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch text content from any URL (portfolio sites, blogs, misc links). Strips HTML to plain text.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize_resume",
            "description": "Output the final verified resume. Call this EXACTLY ONCE when you have gathered enough evidence. Every skill must cite real evidence.",
            "parameters": {
                "type": "object",
                "properties": {
                    "headline": {"type": "string"},
                    "summary": {"type": "string"},
                    "skills": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "evidence": {"type": "string"},
                            },
                            "required": ["name", "evidence"],
                        },
                    },
                    "projects": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "repo_url": {"type": "string"},
                                "deploy_url": {"type": "string"},
                                "stack": {"type": "array", "items": {"type": "string"}},
                                "blurb": {"type": "string"},
                                "verified": {"type": "boolean"},
                            },
                            "required": ["name", "stack", "blurb", "verified"],
                        },
                    },
                    "links_verified": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "url": {"type": "string"},
                                "kind": {"type": "string"},
                                "live": {"type": "boolean"},
                                "note": {"type": "string"},
                            },
                            "required": ["url", "kind", "live"],
                        },
                    },
                    "red_flags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["headline", "summary", "skills", "projects"],
            },
        },
    },
]


SYSTEM_PROMPT = """You are Proof-of-Build, an agent that builds a verified "real resume" for a developer.

You are given the user's self-reported info: name, age, optional resume text, GitHub URL, deployment URLs, and misc links.

Your job:
1. Investigate the GitHub account — list repos, pick the most substantive ones, check commit authorship, read READMEs to understand what was built.
2. Verify every deployment URL is actually live with `check_deployment`.
3. Optionally fetch misc links for extra context.
4. Build a structured resume where EVERY skill and EVERY project is grounded in concrete evidence you observed.
5. Flag anything suspicious (dead deployments, claimed skills with no code, etc).
6. Call `finalize_resume` exactly once to finish.

Rules:
- Don't invent skills the code doesn't show.
- Use tool calls efficiently — you have a budget. Cap GitHub investigation at the top 5 most relevant repos.
- A repo is "verified" only if commits exist authored by the user. A project is "verified" only if both repo + deployment check out.
- Keep summary 2-3 sentences. Headline one line."""


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _gh_headers() -> dict:
    h = {"Accept": GH_ACCEPT}
    if GITHUB_PAT:
        h["Authorization"] = f"Bearer {GITHUB_PAT}"
    return h


def _strip_html(text: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _title_of(html: str) -> str:
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    return m.group(1).strip() if m else ""


# ── Tool implementations ──────────────────────────────────────────────────────

async def _list_repos(client: httpx.AsyncClient, username: str) -> dict:
    r = await client.get(
        f"https://api.github.com/users/{username}/repos?per_page=30&sort=updated&type=owner",
        headers=_gh_headers(),
        timeout=15,
    )
    if r.status_code != 200:
        return {"error": f"GitHub returned {r.status_code}: {r.text[:200]}"}
    repos = r.json() or []
    return {
        "count": len(repos),
        "repos": [
            {
                "name": x.get("name"),
                "description": x.get("description"),
                "language": x.get("language"),
                "stars": x.get("stargazers_count"),
                "updated_at": x.get("updated_at"),
                "html_url": x.get("html_url"),
                "fork": x.get("fork"),
            }
            for x in repos
        ],
    }


async def _get_repo(client: httpx.AsyncClient, owner: str, repo: str) -> dict:
    out: dict = {}
    r = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=_gh_headers(), timeout=15)
    if r.status_code != 200:
        return {"error": f"repo fetch {r.status_code}"}
    data = r.json()
    out["description"] = data.get("description")
    out["topics"] = data.get("topics", [])
    out["default_branch"] = data.get("default_branch")
    out["html_url"] = data.get("html_url")
    out["homepage"] = data.get("homepage")

    rl = await client.get(f"https://api.github.com/repos/{owner}/{repo}/languages", headers=_gh_headers(), timeout=15)
    out["languages"] = rl.json() if rl.status_code == 200 else {}

    try:
        rr = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme",
                              headers={**_gh_headers(), "Accept": "application/vnd.github.raw"}, timeout=15)
        out["readme"] = rr.text[:4000] if rr.status_code == 200 else ""
    except Exception:
        out["readme"] = ""
    return out


async def _list_commits(client: httpx.AsyncClient, owner: str, repo: str, author: str) -> dict:
    r = await client.get(
        f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=30&author={author}",
        headers=_gh_headers(),
        timeout=15,
    )
    if r.status_code != 200:
        return {"error": f"commits {r.status_code}", "by_user": 0}
    commits = r.json() or []
    return {
        "by_user": len(commits),
        "recent_messages": [c.get("commit", {}).get("message", "").splitlines()[0][:120] for c in commits[:10]],
        "first_date": (commits[-1].get("commit", {}).get("author", {}).get("date") if commits else None),
        "last_date": (commits[0].get("commit", {}).get("author", {}).get("date") if commits else None),
    }


async def _get_file_tree(client: httpx.AsyncClient, owner: str, repo: str) -> dict:
    r = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=_gh_headers(), timeout=15)
    if r.status_code != 200:
        return {"error": f"repo {r.status_code}"}
    branch = r.json().get("default_branch", "main")
    rt = await client.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}",
        headers=_gh_headers(), timeout=15,
    )
    if rt.status_code != 200:
        return {"error": f"tree {rt.status_code}"}
    tree = rt.json().get("tree", [])
    return {"entries": [{"path": x["path"], "type": x["type"]} for x in tree[:80]]}


async def _read_file(client: httpx.AsyncClient, owner: str, repo: str, path: str) -> dict:
    r = await client.get(
        f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
        headers={**_gh_headers(), "Accept": "application/vnd.github.raw"},
        timeout=15,
    )
    if r.status_code != 200:
        return {"error": f"file {r.status_code}"}
    return {"path": path, "content": r.text[:8000]}


async def _check_deployment(client: httpx.AsyncClient, url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    t0 = time.perf_counter()
    try:
        r = await client.get(url, timeout=12, follow_redirects=True, headers={"User-Agent": "ProofOfBuild/1.0"})
        ms = int((time.perf_counter() - t0) * 1000)
        body = r.text or ""
        return {
            "url": url,
            "status_code": r.status_code,
            "response_ms": ms,
            "live": 200 <= r.status_code < 400,
            "title": _title_of(body),
            "snippet": _strip_html(body)[:400],
            "final_url": str(r.url),
        }
    except Exception as e:
        return {"url": url, "live": False, "error": str(e)[:200]}


async def _fetch_url(client: httpx.AsyncClient, url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        r = await client.get(url, timeout=12, follow_redirects=True, headers={"User-Agent": "ProofOfBuild/1.0"})
        return {
            "url": url,
            "status_code": r.status_code,
            "title": _title_of(r.text or ""),
            "text": _strip_html(r.text or "")[:3000],
        }
    except Exception as e:
        return {"url": url, "error": str(e)[:200]}


async def _dispatch(name: str, args: dict, http: httpx.AsyncClient) -> dict:
    try:
        if name == "list_repos":
            return await _list_repos(http, args["username"])
        if name == "get_repo":
            return await _get_repo(http, args["owner"], args["repo"])
        if name == "list_commits":
            return await _list_commits(http, args["owner"], args["repo"], args["author"])
        if name == "get_file_tree":
            return await _get_file_tree(http, args["owner"], args["repo"])
        if name == "read_file":
            return await _read_file(http, args["owner"], args["repo"], args["path"])
        if name == "check_deployment":
            return await _check_deployment(http, args["url"])
        if name == "fetch_url":
            return await _fetch_url(http, args["url"])
        return {"error": f"unknown tool: {name}"}
    except KeyError as e:
        return {"error": f"missing argument: {e}"}
    except Exception as e:
        return {"error": str(e)[:300]}


def _summarize_call(name: str, args: dict) -> str:
    if name == "list_repos": return f"→ Listing repos for @{args.get('username','?')}"
    if name == "get_repo": return f"→ Inspecting {args.get('owner','?')}/{args.get('repo','?')}"
    if name == "list_commits": return f"→ Checking commits by @{args.get('author','?')} in {args.get('repo','?')}"
    if name == "get_file_tree": return f"→ Reading file tree of {args.get('repo','?')}"
    if name == "read_file": return f"→ Reading {args.get('path','?')} in {args.get('repo','?')}"
    if name == "check_deployment": return f"→ Probing deployment {args.get('url','?')}"
    if name == "fetch_url": return f"→ Fetching {args.get('url','?')}"
    if name == "finalize_resume": return "→ Composing verified resume"
    return f"→ {name}"


def _summarize_result(name: str, result: dict) -> str:
    if "error" in result:
        return f"  ⚠ {result['error']}"
    if name == "list_repos":
        return f"  ✓ {result.get('count', 0)} repos"
    if name == "get_repo":
        langs = ", ".join(list(result.get("languages", {}).keys())[:4]) or "—"
        return f"  ✓ langs: {langs}"
    if name == "list_commits":
        return f"  ✓ {result.get('by_user', 0)} commits by user"
    if name == "get_file_tree":
        return f"  ✓ {len(result.get('entries', []))} entries"
    if name == "read_file":
        return f"  ✓ read {len(result.get('content', ''))} chars"
    if name == "check_deployment":
        if result.get("live"):
            return f"  ✓ live · {result.get('status_code')} · {result.get('response_ms')}ms"
        return f"  ✗ offline ({result.get('status_code', 'n/a')})"
    if name == "fetch_url":
        return f"  ✓ {result.get('status_code', '?')} · {len(result.get('text',''))} chars"
    return "  ✓ ok"


# ── GitHub username extraction ────────────────────────────────────────────────

def _gh_username(submission: Submission) -> str | None:
    url = (submission.github_url or "").strip()
    if not url:
        return None
    if "/" not in url and "." not in url:
        return url
    try:
        p = urlparse(url if "://" in url else "https://" + url)
        parts = [x for x in p.path.split("/") if x]
        return parts[0] if parts else None
    except Exception:
        return None


# ── Main agent loop ───────────────────────────────────────────────────────────

async def run_pipeline(submission_id: str, run_id: str, db_factory, **_):
    db: Session = db_factory()
    try:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not run or not submission:
            return

        logs: list[str] = []

        def log(line: str, label: str | None = None):
            logs.append(line)
            run.step_logs = logs
            if label is not None:
                run.step_label = label
            db.commit()

        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        run.step_label = "Booting agent"
        db.commit()

        log("→ Agent starting", "Booting agent")
        log(f"→ Model: {MODEL}")

        if not OPENROUTER_KEY:
            raise RuntimeError("OPENROUTER_API_KEY missing in .env")

        # Pre-compute GitHub username hint for the agent
        gh_user = _gh_username(submission)
        submission_blob = {
            "name": submission.name,
            "age": submission.age,
            "email": submission.email,
            "resume_text": submission.resume_text,
            "github_url": submission.github_url,
            "github_username_hint": gh_user,
            "deployment_urls": submission.deployment_urls,
            "misc_links": submission.misc_links,
            "misc_notes": submission.misc_notes,
        }

        oai = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_KEY,
        )

        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "Here is the candidate's submission:\n\n" + json.dumps(submission_blob, indent=2)},
        ]

        final_payload: dict | None = None

        async with httpx.AsyncClient() as http:
            for it in range(MAX_ITERATIONS):
                run.current_step = it + 1
                run.step_label = f"Thinking (iter {it + 1})"
                db.commit()
                log(f"→ [iter {it + 1}] thinking…", f"Thinking (iter {it + 1})")

                resp = await oai.chat.completions.create(
                    model=MODEL,
                    messages=messages,
                    tools=TOOLS,
                    temperature=0.3,
                )
                msg = resp.choices[0].message
                tool_calls = msg.tool_calls or []

                # Persist assistant message back into context
                assistant_entry: dict = {"role": "assistant", "content": msg.content or ""}
                if tool_calls:
                    assistant_entry["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in tool_calls
                    ]
                messages.append(assistant_entry)

                if not tool_calls:
                    if msg.content:
                        log(f"  agent: {msg.content[:200]}")
                    log("⚠ Agent produced no tool calls — stopping")
                    break

                stop_loop = False
                for tc in tool_calls:
                    name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}

                    log(_summarize_call(name, args), label=name)

                    if name == "finalize_resume":
                        final_payload = args
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps({"ok": True}),
                        })
                        log("  ✓ resume finalized")
                        stop_loop = True
                        continue

                    result = await _dispatch(name, args, http)
                    log(_summarize_result(name, result))
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result)[:8000],
                    })

                if stop_loop:
                    break
            else:
                log("⚠ Hit max iterations without finalize_resume")

        if not final_payload:
            raise RuntimeError("Agent did not produce a finalized resume")

        # Enrich payload with submission metadata
        verified_at = datetime.now(timezone.utc).isoformat()
        payload = {
            "name": submission.name,
            "age": submission.age,
            "email": submission.email,
            "github_url": submission.github_url,
            "github_username": gh_user,
            "verified_at": verified_at,
            **final_payload,
        }

        result = Result(
            id=str(uuid.uuid4()),
            submission_id=submission_id,
            analysis_run_id=run_id,
        )
        result.payload = payload
        db.add(result)

        run.status = "done"
        run.step_label = "Done"
        run.finished_at = datetime.now(timezone.utc)
        log("✓ Done", "Done")
        db.commit()

    except Exception as exc:
        db.rollback()
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.error = str(exc)[:500]
            run.finished_at = datetime.now(timezone.utc)
            try:
                logs = run.step_logs
                logs.append(f"✗ {exc}")
                run.step_logs = logs
            except Exception:
                pass
            db.commit()
        raise
    finally:
        db.close()
