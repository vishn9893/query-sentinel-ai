"""Query Sentinel AI — FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import HealthResponse
from app.routes.alerts import router as alerts_router
from app.routes.chat import router as chat_router
from app.routes.chat import translator
from app.routes.dashboard import router as dashboard_router
from app.routes.hunt import router as hunt_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Log active provider and model name on startup."""
    logger.info(
        "Query Sentinel AI starting up — provider: %s | model: %s",
        type(translator.provider).__name__,
        translator.model_name,
    )
    yield
    logger.info("Query Sentinel AI shutting down.")


app = FastAPI(
    title="Query Sentinel AI",
    version="0.3.0",
    description=(
        "Open-source explainable AI investigation copilot for Wazuh SIEM. "
        "Translates natural-language questions into Elasticsearch DSL queries and "
        "produces structured threat-intelligence reports."
    ),
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow all origins for development; tighten in production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(chat_router)
app.include_router(alerts_router)
app.include_router(dashboard_router)
app.include_router(hunt_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Liveness probe — always returns 200 OK when the service is running."""
    return HealthResponse(status="ok", service="query-sentinel-ai")
