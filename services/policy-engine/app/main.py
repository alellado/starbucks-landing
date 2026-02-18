from __future__ import annotations

import re
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field


class ValidateRequest(BaseModel):
    versionId: str
    documentId: str
    plainText: str = Field(default="")
    graph: dict[str, Any] | None = None


class Finding(BaseModel):
    code: str
    severity: str
    message: str


class ValidateResponse(BaseModel):
    score: float
    blockingIssues: int
    findings: list[Finding]


app = FastAPI(title="Policy Engine", version="0.1.0")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/validate", response_model=ValidateResponse)
def validate(payload: ValidateRequest) -> ValidateResponse:
    text = payload.plainText.strip()
    findings: list[Finding] = []

    lowered = text.lower()
    word_count = len(re.findall(r"\b\w+\b", text))

    if word_count < 80:
        findings.append(
            Finding(
                code="CONTENT_TOO_SHORT",
                severity="warning",
                message="El contenido es muy corto para SEO y conversion inicial.",
            )
        )

    risky_claim_markers = [
        "garantizado",
        "garantizada",
        "100%",
        "sin riesgo",
        "asegurado",
    ]
    if any(marker in lowered for marker in risky_claim_markers):
        findings.append(
            Finding(
                code="LEGAL_CLAIM_UNSUPPORTED",
                severity="blocker",
                message="Se detectaron claims absolutos que requieren soporte legal/evidencia.",
            )
        )

    if "http://" in lowered:
        findings.append(
            Finding(
                code="SEO_INSECURE_LINK",
                severity="warning",
                message="Se detectaron enlaces inseguro HTTP; usa HTTPS.",
            )
        )

    if len(re.findall(r"!\s*$", text, re.MULTILINE)) > 3:
        findings.append(
            Finding(
                code="BRAND_TONE_AGGRESSIVE",
                severity="info",
                message="El tono puede ser demasiado agresivo para una marca consultiva.",
            )
        )

    blockers = sum(1 for finding in findings if finding.severity == "blocker")
    warnings = sum(1 for finding in findings if finding.severity == "warning")
    infos = sum(1 for finding in findings if finding.severity == "info")

    score = 100.0 - (blockers * 35.0) - (warnings * 10.0) - (infos * 4.0)
    if score < 0:
        score = 0.0

    return ValidateResponse(
        score=round(score, 2),
        blockingIssues=blockers,
        findings=findings,
    )

