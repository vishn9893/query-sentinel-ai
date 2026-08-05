from fastapi import FastAPI

from app.models import ChatRequest, ChatResponse, HealthResponse, QueryPreview
from app.services.llm import QueryTranslator

app = FastAPI(title="Query Sentinel AI", version="0.2.0")
translator = QueryTranslator()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="query-sentinel-ai")


@app.post("/translate", response_model=QueryPreview)
def translate(request: ChatRequest) -> QueryPreview:
    return translator.translate(request.message)


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    preview = translator.translate(request.message)
    return ChatResponse(
        answer=preview.summary,
        query=preview.query,
        explanation=preview.explanation,
        model=preview.model,
    )
