"""Dashboard aggregation routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.models import DashboardResponse
from app.services.wazuh import WazuhClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

# Module-level singleton
wazuh_client = WazuhClient()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    hours: int = Query(24, ge=1, le=8760, description="Look-back window in hours"),
) -> DashboardResponse:
    """Return aggregated metrics for the main dashboard."""
    try:
        severity_counts, top_agents, timeline = (
            await wazuh_client.get_alert_counts_by_severity(hours=hours),
            await wazuh_client.get_top_agents(hours=hours),
            await wazuh_client.get_timeline(hours=hours),
        )
    except Exception as exc:
        logger.error("Dashboard aggregation failed: %s", exc)
        raise HTTPException(
            status_code=502, detail=f"Data retrieval error: {exc}"
        ) from exc

    total_alerts_24h = sum(severity_counts.values())

    return DashboardResponse(
        severity_counts=severity_counts,
        top_agents=top_agents,
        timeline=timeline,
        total_alerts_24h=total_alerts_24h,
    )
