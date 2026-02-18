from __future__ import annotations

import hashlib
import os
import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field


class IntentPayload(BaseModel):
    id: str
    title: str
    objective: str
    audience: str
    tone: str


class GenerateRequest(BaseModel):
    documentTitle: str = Field(min_length=1)
    mode: str = Field(default="draft")
    instructions: str = Field(default="")
    intent: IntentPayload | None = None


class GenerateResponse(BaseModel):
    graph: dict[str, Any]
    plainText: str
    changeSummary: str
    trace: dict[str, Any]


app = FastAPI(title="AI Orchestrator", version="0.1.0")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest) -> GenerateResponse:
    started = time.perf_counter()

    base_prompt = build_prompt(payload)
    blocks = build_blocks(payload)
    plain_text = "\n\n".join(block["content"] for block in blocks)
    graph = {
        "documentType": "marketing-page",
        "nodes": blocks,
        "edges": build_edges(blocks),
    }
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    trace = {
        "modelName": os.getenv("AI_MODEL_NAME", "mock-ai-v1"),
        "promptText": base_prompt,
        "promptHash": hashlib.sha256(base_prompt.encode("utf-8")).hexdigest(),
        "tools": ["content_graph_builder"],
        "sources": ["intent_payload" if payload.intent else "document_title_only"],
        "tokenInput": max(64, len(base_prompt) // 4),
        "tokenOutput": max(96, len(plain_text) // 4),
        "latencyMs": elapsed_ms,
    }

    return GenerateResponse(
        graph=graph,
        plainText=plain_text,
        changeSummary=f"Generated {len(blocks)} blocks in mode={payload.mode}",
        trace=trace,
    )


def build_prompt(payload: GenerateRequest) -> str:
    if payload.intent is None:
        return (
            f"Generate {payload.mode} content for document '{payload.documentTitle}'. "
            f"Instructions: {payload.instructions or 'none'}."
        )

    return (
        f"Generate {payload.mode} content for '{payload.documentTitle}'. "
        f"Intent title: {payload.intent.title}. Objective: {payload.intent.objective}. "
        f"Audience: {payload.intent.audience}. Tone: {payload.intent.tone}. "
        f"Instructions: {payload.instructions or 'none'}."
    )


def build_blocks(payload: GenerateRequest) -> list[dict[str, Any]]:
    intent = payload.intent
    objective = intent.objective if intent else "Present value quickly and clearly."
    audience = intent.audience if intent else "General audience"
    tone = intent.tone if intent else "clear"
    instructions = payload.instructions.strip()

    hero = {
        "id": "hero-1",
        "type": "hero",
        "content": f"{payload.documentTitle}: {objective}",
        "meta": {"tone": tone},
    }
    problem = {
        "id": "section-1",
        "type": "section",
        "content": f"For {audience}, the main friction is complexity and slow execution.",
        "meta": {"focus": "problem"},
    }
    solution = {
        "id": "section-2",
        "type": "section",
        "content": (
            "Our approach combines AI generation, policy validation, and multi-channel publishing "
            "in one workflow."
        ),
        "meta": {"focus": "solution"},
    }
    cta_text = "Request a demo and launch your first AI-assisted publication this week."
    if instructions:
        cta_text = f"{cta_text} Editor note: {instructions}"
    cta = {"id": "cta-1", "type": "cta", "content": cta_text, "meta": {"priority": "high"}}

    return [hero, problem, solution, cta]


def build_edges(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    edges = []
    for index, block in enumerate(blocks):
        if index == 0:
            continue
        edges.append(
            {
                "from": blocks[index - 1]["id"],
                "to": block["id"],
                "relation": "next",
                "order": index,
            }
        )
    return edges

