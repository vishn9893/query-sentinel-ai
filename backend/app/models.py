"""Pydantic models for Query Sentinel AI."""
from __future__ import annotations

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


class ExecuteRequest(BaseModel):
    query: str  # JSON string of the DSL
    index: str = "wazuh-alerts-*"


class ExecuteResponse(BaseModel):
    hits: int
    took_ms: int
    alerts: list[dict]
    raw: dict  # full ES response


class AlertsResponse(BaseModel):
    alerts: list[dict]
    total: int


class DashboardResponse(BaseModel):
    severity_counts: dict  # {"low": int, "medium": int, "high": int, "critical": int}
    top_agents: list[dict]  # [{"agent": str, "count": int}]
    timeline: list[dict]    # [{"timestamp": str, "count": int}]
    total_alerts_24h: int


class InvestigationResult(BaseModel):
    summary: str
    risk_score: int
    confidence: str
    iocs: list[dict]
    mitre_techniques: list[dict]
    next_steps: list[str]
    model: str


class HuntRequest(BaseModel):
    objective: str
    hours: int = 24


class InvestigateRequest(BaseModel):
    message: str
    query: str
    alerts: list[dict] = []
