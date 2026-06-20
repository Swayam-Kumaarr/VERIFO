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
        green = colors.HexColor("#22c55e")

        title_style = ParagraphStyle("title", parent=styles["Heading1"], textColor=purple, fontSize=20, spaceAfter=4)
        sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=colors.grey, fontSize=9, spaceAfter=12)
        section_style = ParagraphStyle("section", parent=styles["Heading2"], textColor=purple, fontSize=12, spaceBefore=14, spaceAfter=6)
        body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=9, leading=14)

        story = [
            Paragraph(f"Proof of Build — Verified Resume", title_style),
            Paragraph(f"{payload.get('name', payload.get('user', 'Unknown'))} · {payload.get('email', '')} · verified {datetime.utcnow().strftime('%Y-%m-%d')}", sub_style),
            Paragraph(f"Authenticity Score: {payload.get('authenticity_score', 0)}/100", body_style),
            Spacer(1, 0.3*cm),
        ]

        if payload.get("resume_summary"):
            story += [Paragraph("Summary", section_style), Paragraph(payload["resume_summary"], body_style), Spacer(1, 0.2*cm)]

        if payload.get("projects"):
            story.append(Paragraph("Verified Projects", section_style))
            for p in payload["projects"]:
                deploy = p.get("deployment", {})
                status = f"{'Live' if deploy.get('live') else 'Offline'} · {deploy.get('response_ms', '—')}ms"
                story.append(Paragraph(f"<b>{p['name']}</b> — {status}", body_style))
                story.append(Paragraph(f"Commits: {p.get('commits_yours')} · Contribution: {p.get('contribution_pct')}% · Lines added: +{p.get('lines_added')}", body_style))
                story.append(Spacer(1, 0.15*cm))

        skill_tags = payload.get("skill_tags", {})
        if skill_tags.get("verified"):
            story += [
                Paragraph("Verified Skills", section_style),
                Paragraph(", ".join(skill_tags["verified"]), body_style),
            ]

        doc.build(story)
        buf.seek(0)
        filename = f"proof-ledger-{payload.get('user', submission_id)}.pdf"
        return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    except ImportError:
        raise HTTPException(500, "PDF generation requires reportlab — run: pip install reportlab")
