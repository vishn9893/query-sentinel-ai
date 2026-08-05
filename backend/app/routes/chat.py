"""Chat, translation, investigation and streaming routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.models import (
    ChatRequest,
    ChatResponse,
    InvestigateRequest,
    InvestigationResult,
    QueryPreview,
)
from app.services.llm import QueryTranslator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# Module-level singleton — provider is initialised once on import.
translator = QueryTranslator()


@router.post("/translate", response_model=QueryPreview)
async def translate(request: ChatRequest) -> QueryPreview:
    """Convert a natural-language security question into an Elasticsearch DSL query."""
    return await translator.translate(request.message)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Translate and return a chat-style response with the generated query."""
    preview = await translator.translate(request.message)
    return ChatResponse(
        answer=preview.summary,
        query=preview.query,
        explanation=preview.explanation,
        model=preview.model,
    )


@router.post("/investigate", response_model=InvestigationResult)
async def investigate(request: InvestigateRequest) -> InvestigationResult:
    """Run a structured threat-intelligence investigation on the provided alerts."""
    return await translator.investigate(
        user_message=request.message,
        query=request.query,
        alerts=request.alerts,
    )


@router.get("/stream")
async def stream(message: str = Query(..., description="Natural-language query to stream")) -> StreamingResponse:
    """Server-Sent Events (SSE) endpoint that streams LLM tokens in real time."""

    async def _event_generator():
        try:
            async for token in translator.provider.stream(
                message, system="You are a Wazuh SIEM expert. Answer concisely."
            ):
                # Escape newlines inside a token so SSE framing is not broken
                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"
        except Exception as exc:
            logger.error("Stream error: %s", exc)
            yield f"data: [ERROR] {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
