"""Wazuh API and Elasticsearch client."""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone

import httpx

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

WAZUH_API_URL: str = os.getenv("WAZUH_API_URL", "")
WAZUH_API_USER: str = os.getenv("WAZUH_API_USER", "wazuh")
WAZUH_API_PASSWORD: str = os.getenv("WAZUH_API_PASSWORD", "wazuh")
ELASTIC_URL: str = os.getenv("ELASTIC_URL", "")
ELASTIC_API_KEY: str = os.getenv("ELASTIC_API_KEY", "")

_TOKEN_TTL_SECONDS = 15 * 60  # 15 minutes

# ---------------------------------------------------------------------------
# Mock data helpers
# ---------------------------------------------------------------------------

_MOCK_ALERTS: list[dict] = [
    {
        "id": "mock-001",
        "timestamp": "2026-08-05T08:12:34.000Z",
        "rule.level": 12,
        "rule.description": "Multiple failed SSH login attempts (brute force)",
        "rule.groups": ["authentication_failed", "syslog", "sshd"],
        "rule.mitre.technique": "T1110",
        "agent.name": "web-server-01",
        "agent.ip": "10.0.1.10",
        "data.srcip": "185.220.101.47",
    },
    {
        "id": "mock-002",
        "timestamp": "2026-08-05T08:15:01.000Z",
        "rule.level": 10,
        "rule.description": "Possible web application attack — SQL injection attempt",
        "rule.groups": ["web", "attack", "sql_injection"],
        "rule.mitre.technique": "T1190",
        "agent.name": "web-server-01",
        "agent.ip": "10.0.1.10",
        "data.srcip": "45.33.32.156",
    },
    {
        "id": "mock-003",
        "timestamp": "2026-08-05T09:02:11.000Z",
        "rule.level": 14,
        "rule.description": "Shellshock attack attempt",
        "rule.groups": ["web", "attack", "shellshock"],
        "rule.mitre.technique": "T1059",
        "agent.name": "api-gateway-02",
        "agent.ip": "10.0.1.20",
        "data.srcip": "198.54.117.200",
    },
    {
        "id": "mock-004",
        "timestamp": "2026-08-05T09:45:55.000Z",
        "rule.level": 8,
        "rule.description": "New user account created on system",
        "rule.groups": ["account_created", "syslog"],
        "rule.mitre.technique": "T1136",
        "agent.name": "db-server-03",
        "agent.ip": "10.0.2.30",
        "data.srcip": "10.0.2.30",
    },
    {
        "id": "mock-005",
        "timestamp": "2026-08-05T10:33:22.000Z",
        "rule.level": 7,
        "rule.description": "Possible credential dumping via LSASS access",
        "rule.groups": ["windows", "credential_access"],
        "rule.mitre.technique": "T1003",
        "agent.name": "workstation-win-07",
        "agent.ip": "10.0.3.17",
        "data.srcip": "10.0.3.17",
        "data.win.eventdata.user": "DOMAIN\\\\svc_backup",
    },
]

_MOCK_ES_HITS: list[dict] = [
    {
        "_index": "wazuh-alerts-4.x-2026.08.05",
        "_id": "mock-es-001",
        "_score": 1.0,
        "_source": _MOCK_ALERTS[0],
    },
    {
        "_index": "wazuh-alerts-4.x-2026.08.05",
        "_id": "mock-es-002",
        "_score": 1.0,
        "_source": _MOCK_ALERTS[1],
    },
    {
        "_index": "wazuh-alerts-4.x-2026.08.05",
        "_id": "mock-es-003",
        "_score": 1.0,
        "_source": _MOCK_ALERTS[2],
    },
]


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class WazuhClient:
    """Unified client for Wazuh Manager API and Elasticsearch."""

    # Class-level token cache: {url: {"token": str, "expires_at": float}}
    _token_cache: dict[str, dict] = {}

    def __init__(self) -> None:
        self.wazuh_url = WAZUH_API_URL.rstrip("/") if WAZUH_API_URL else ""
        self.wazuh_user = WAZUH_API_USER
        self.wazuh_password = WAZUH_API_PASSWORD
        self.elastic_url = ELASTIC_URL.rstrip("/") if ELASTIC_URL else ""
        self.elastic_api_key = ELASTIC_API_KEY
        self.enabled = bool(self.wazuh_url or self.elastic_url)

    # ------------------------------------------------------------------
    # Wazuh Manager authentication
    # ------------------------------------------------------------------

    async def _get_wazuh_token(self) -> str:
        """Authenticate with Wazuh Manager and return a JWT token.

        Token is cached for 15 minutes to avoid hammering the auth endpoint.
        """
        cache_key = self.wazuh_url
        cached = self._token_cache.get(cache_key)
        if cached and cached["expires_at"] > time.monotonic():
            return cached["token"]

        async with httpx.AsyncClient(verify=False, timeout=30) as client:  # noqa: S501
            response = await client.post(
                f"{self.wazuh_url}/security/user/authenticate",
                auth=(self.wazuh_user, self.wazuh_password),
            )
            response.raise_for_status()
            token: str = response.json()["data"]["token"]

        self._token_cache[cache_key] = {
            "token": token,
            "expires_at": time.monotonic() + _TOKEN_TTL_SECONDS,
        }
        return token

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------

    async def get_alerts(
        self,
        limit: int = 100,
        level: int | None = None,
        hours: int = 24,
    ) -> list[dict]:
        """Retrieve alerts from Wazuh Manager API.

        Falls back to realistic mock data when the API is not configured.
        """
        if not self.wazuh_url:
            alerts = _MOCK_ALERTS[:limit]
            if level is not None:
                alerts = [a for a in alerts if a.get("rule.level", 0) >= level]
            return alerts

        token = await self._get_wazuh_token()
        params: dict = {"limit": limit}
        if level is not None:
            params["q"] = f"rule.level>={level}"

        async with httpx.AsyncClient(verify=False, timeout=30) as client:  # noqa: S501
            response = await client.get(
                f"{self.wazuh_url}/alerts",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", {}).get("affected_items", [])

    # ------------------------------------------------------------------
    # Elasticsearch
    # ------------------------------------------------------------------

    async def execute_elastic_query(self, index: str, dsl_query: dict) -> dict:
        """Execute a DSL query against Elasticsearch.

        Returns the full Elasticsearch response dict.
        Falls back to a mock response when Elasticsearch is not configured.
        """
        if not self.elastic_url:
            return {
                "took": 4,
                "timed_out": False,
                "hits": {
                    "total": {"value": 42, "relation": "eq"},
                    "max_score": 1.0,
                    "hits": _MOCK_ES_HITS,
                },
                "_shards": {"total": 5, "successful": 5, "skipped": 0, "failed": 0},
            }

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.elastic_api_key:
            headers["Authorization"] = f"Bearer {self.elastic_api_key}"

        async with httpx.AsyncClient(verify=False, timeout=60) as client:  # noqa: S501
            response = await client.post(
                f"{self.elastic_url}/{index}/_search",
                headers=headers,
                json=dsl_query,
            )
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # Dashboard aggregations
    # ------------------------------------------------------------------

    async def get_alert_counts_by_severity(self, hours: int = 24) -> dict:
        """Return alert counts bucketed by severity band.

        Severity mapping (Wazuh rule.level):
          1-6  → low
          7-11 → medium
          12-14→ high
          15   → critical
        """
        alerts = await self.get_alerts(limit=1000, hours=hours)
        counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for alert in alerts:
            lvl = alert.get("rule.level", 0)
            if lvl >= 15:
                counts["critical"] += 1
            elif lvl >= 12:
                counts["high"] += 1
            elif lvl >= 7:
                counts["medium"] += 1
            else:
                counts["low"] += 1
        return counts

    async def get_top_agents(self, hours: int = 24, limit: int = 10) -> list[dict]:
        """Return the top agents by alert count."""
        alerts = await self.get_alerts(limit=1000, hours=hours)
        agent_counts: dict[str, int] = {}
        for alert in alerts:
            name = alert.get("agent.name", "unknown")
            agent_counts[name] = agent_counts.get(name, 0) + 1

        sorted_agents = sorted(agent_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"agent": name, "count": count} for name, count in sorted_agents[:limit]]

    async def get_timeline(self, hours: int = 24) -> list[dict]:
        """Return alert counts in 1-hour buckets for the last *hours* hours.

        Returns a list of ``{"timestamp": ISO-8601 str, "count": int}``.
        When real data is unavailable the mock returns a plausible sine-wave
        pattern so dashboards render something useful.
        """
        if not self.enabled:
            now = datetime.now(timezone.utc)
            buckets: list[dict] = []
            import math

            for h in range(hours, 0, -1):
                ts = now.replace(
                    minute=0, second=0, microsecond=0
                ).timestamp() - (h * 3600)
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                # Plausible activity: higher during business hours
                hour_of_day = dt.hour
                base = 5 + int(20 * abs(math.sin(math.pi * hour_of_day / 12)))
                buckets.append({"timestamp": dt.isoformat(), "count": base})
            return buckets

        # With real data, use Elasticsearch aggregations
        dsl = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": f"now-{hours}h"}}},
            "aggs": {
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1h",
                    }
                }
            },
        }
        try:
            result = await self.execute_elastic_query("wazuh-alerts-*", dsl)
            buckets_raw = (
                result.get("aggregations", {}).get("timeline", {}).get("buckets", [])
            )
            return [
                {
                    "timestamp": b.get("key_as_string", ""),
                    "count": b.get("doc_count", 0),
                }
                for b in buckets_raw
            ]
        except Exception:
            return []
