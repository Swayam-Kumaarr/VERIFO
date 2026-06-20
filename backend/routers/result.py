import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Result
from schemas import ResultOut

router = APIRouter(prefix="/api/result", tags=["result"])


def _row_to_out(r: Result) -> dict:
    return {
        "id": r.id,
        "submission_id": r.submission_id,
        "analysis_run_id": r.analysis_run_id,
        "payload": r.payload,
        "created_at": r.created_at,
    }


@router.get("/{submission_id}", response_model=ResultOut)
def get_result(submission_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(Result)
        .filter(Result.submission_id == submission_id)
        .order_by(Result.created_at.desc())
        .first()
    )
    if not result:
        raise HTTPException(404, "Result not ready yet — analysis may still be running")
    return _row_to_out(result)


@router.get("/{submission_id}/pdf")
def download_pdf(submission_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(Result)
        .filter(Result.submission_id == submission_id)
        .order_by(Result.created_at.desc())
        .first()
    )
    if not result:
        raise HTTPException(404, "Result not ready yet")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

        payload = result.payload
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        purple = colors.HexColor("#6c63ff")

        title_style = ParagraphStyle("title", parent=styles["Heading1"], textColor=purple, fontSize=22, spaceAfter=2)
        headline_style = ParagraphStyle("headline", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#374151"), spaceAfter=4)
        sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=colors.grey, fontSize=9, spaceAfter=12)
        section_style = ParagraphStyle("section", parent=styles["Heading2"], textColor=purple, fontSize=12, spaceBefore=14, spaceAfter=6)
        body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=9, leading=14)
        small_style = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey, leading=11)

        name = payload.get("name") or payload.get("github_username") or "Unknown"
        verified_when = payload.get("verified_at", datetime.utcnow().isoformat())[:10]
        meta_bits = [b for b in [payload.get("email"), payload.get("github_url")] if b]

        story = [
            Paragraph(name, title_style),
            Paragraph(payload.get("headline", ""), headline_style),
            Paragraph(" · ".join(meta_bits + [f"verified {verified_when}"]), sub_style),
        ]

        if payload.get("summary"):
            story += [Paragraph("Summary", section_style), Paragraph(payload["summary"], body_style)]

        skills = payload.get("skills") or []
        if skills:
            story.append(Paragraph("Verified Skills", section_style))
            for s in skills:
                story.append(Paragraph(f"<b>{s.get('name','')}</b> — {s.get('evidence','')}", body_style))

        projects = payload.get("projects") or []
        if projects:
            story.append(Paragraph("Verified Projects", section_style))
            for p in projects:
                badge = "✓ verified" if p.get("verified") else "unverified"
                stack = ", ".join(p.get("stack", []))
                story.append(Paragraph(f"<b>{p.get('name','')}</b> — {badge}", body_style))
                if stack:
                    story.append(Paragraph(f"<i>{stack}</i>", small_style))
                if p.get("blurb"):
                    story.append(Paragraph(p["blurb"], body_style))
                refs = []
                if p.get("repo_url"): refs.append(f"repo: {p['repo_url']}")
                if p.get("deploy_url"): refs.append(f"deploy: {p['deploy_url']}")
                if refs:
                    story.append(Paragraph(" · ".join(refs), small_style))
                story.append(Spacer(1, 0.15*cm))

        links = payload.get("links_verified") or []
        if links:
            story.append(Paragraph("Verified Links", section_style))
            for l in links:
                mark = "✓" if l.get("live") else "✗"
                story.append(Paragraph(f"{mark} {l.get('url','')} ({l.get('kind','')}) — {l.get('note','')}", body_style))

        flags = payload.get("red_flags") or []
        if flags:
            story.append(Paragraph("Red Flags", section_style))
            for f in flags:
                story.append(Paragraph(f"• {f}", body_style))

        doc.build(story)
        buf.seek(0)
        slug = payload.get("github_username") or name.replace(" ", "-").lower()
        filename = f"proof-of-build-{slug}.pdf"
        return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    except ImportError:
        raise HTTPException(500, "PDF generation requires reportlab — run: pip install reportlab")
