from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class QueryPreview(BaseModel):
    query: str
    summary: str
    explanation: str
    model: str


class ChatResponse(BaseModel):
    answer: str
    query: str
    explanation: str
    model: str


class HealthResponse(BaseModel):
    status: str
    service: str
