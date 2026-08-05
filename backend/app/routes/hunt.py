"""Autonomous threat-hunting route — chains translate → execute → investigate."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException

from app.models import HuntRequest, InvestigationResult
from app.routes.alerts import wazuh_client
from app.routes.chat import translator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["hunt"])


@router.post("/hunt", response_model=InvestigationResult)
async def hunt(request: HuntRequest) -> InvestigationResult:
    """Agentic threat-hunt: translate objective → execute query → investigate results.

    This endpoint chains three AI / API calls automatically:
    1. Translate the *objective* into an Elasticsearch DSL query.
    2. Execute that query against the Wazuh / Elasticsearch backend.
    3. Run a full threat-intelligence investigation on the returned alerts.
    """
    # --- Step 1: Translate natural-language objective to DSL -----------------
    logger.info("Hunt step 1 — translating objective: %r", request.objective)
    try:
        preview = await translator.translate(request.objective)
    except Exception as exc:
        logger.error("Hunt: translation failed — %s", exc)
        raise HTTPException(
            status_code=500, detail=f"Query translation failed: {exc}"
        ) from exc

    # --- Step 2: Execute the DSL against Elasticsearch -----------------------
    logger.info("Hunt step 2 — executing query against wazuh-alerts-*")
    try:
        dsl = json.loads(preview.query)

        # Inject the requested hours window if the query doesn't already have one
        # (the translator may have used a different default)
        query_node = dsl.get("query", {})
        bool_node = query_node.get("bool", {})
        must_clauses = bool_node.get("must", [])
        has_timestamp_filter = any(
            "range" in clause and "@timestamp" in clause.get("range", {})
            for clause in (must_clauses if isinstance(must_clauses, list) else [])
        )
        if not has_timestamp_filter and request.hours != 24:
            # Wrap the existing query in a bool-must with a time range
            dsl = {
                "query": {
                    "bool": {
                        "must": [
                            {"range": {"@timestamp": {"gte": f"now-{request.hours}h"}}},
                            query_node,
                        ]
                    }
                },
                "size": dsl.get("size", 100),
            }

        es_response = await wazuh_client.execute_elastic_query("wazuh-alerts-*", dsl)
    except Exception as exc:
        logger.error("Hunt: Elasticsearch execution failed — %s", exc)
        raise HTTPException(
            status_code=502, detail=f"Query execution failed: {exc}"
        ) from exc

    hits_node = es_response.get("hits", {})
    raw_hits: list[dict] = hits_node.get("hits", [])
    alerts = [h.get("_source", h) for h in raw_hits]
    alert_count = hits_node.get("total", {}).get("value", len(alerts))

    logger.info("Hunt step 2 — %d alert(s) returned", alert_count)

    # --- Step 3: Investigate the results -------------------------------------
    logger.info("Hunt step 3 — running investigation on %d alert(s)", len(alerts))
    try:
        result = await translator.investigate(
            user_message=request.objective,
            query=preview.query,
            alerts=alerts,
        )
    except Exception as exc:
        logger.error("Hunt: investigation failed — %s", exc)
        raise HTTPException(
            status_code=500, detail=f"Investigation failed: {exc}"
        ) from exc

    return result
