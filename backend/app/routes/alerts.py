"""Alert retrieval and Elasticsearch query execution routes."""
from __future__ import annotations

import json
import logging
import time

from fastapi import APIRouter, HTTPException, Query

from app.models import AlertsResponse, ExecuteRequest, ExecuteResponse
from app.services.wazuh import WazuhClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["alerts"])

# Module-level singleton
wazuh_client = WazuhClient()


@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    limit: int = Query(100, ge=1, le=10000, description="Maximum number of alerts to return"),
    level: int | None = Query(None, ge=1, le=15, description="Minimum Wazuh rule level"),
    hours: int = Query(24, ge=1, le=8760, description="Look-back window in hours"),
) -> AlertsResponse:
    """Retrieve recent Wazuh alerts filtered by severity and time window."""
    try:
        alerts = await wazuh_client.get_alerts(limit=limit, level=level, hours=hours)
    except Exception as exc:
        logger.error("Failed to fetch alerts: %s", exc)
        raise HTTPException(status_code=502, detail=f"Wazuh API error: {exc}") from exc

    return AlertsResponse(alerts=alerts, total=len(alerts))


@router.post("/execute", response_model=ExecuteResponse)
async def execute_query(request: ExecuteRequest) -> ExecuteResponse:
    """Parse a JSON DSL string and execute it against Elasticsearch."""
    try:
        dsl = json.loads(request.query)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON DSL: {exc}",
        ) from exc

    start = time.monotonic()
    try:
        es_response = await wazuh_client.execute_elastic_query(request.index, dsl)
    except Exception as exc:
        logger.error("Elasticsearch query failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Elasticsearch error: {exc}") from exc

    took_ms = int((time.monotonic() - start) * 1000)

    hits_node = es_response.get("hits", {})
    total_hits: int = hits_node.get("total", {}).get("value", 0)
    if isinstance(total_hits, dict):
        total_hits = total_hits.get("value", 0)
    hit_docs: list[dict] = [
        h.get("_source", h) for h in hits_node.get("hits", [])
    ]

    return ExecuteResponse(
        hits=total_hits,
        took_ms=took_ms,
        alerts=hit_docs,
        raw=es_response,
    )
