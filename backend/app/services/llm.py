"""LLM-powered query translator and investigation engine."""
from __future__ import annotations

import json
import logging
import re

from app.models import InvestigationResult, QueryPreview
from app.prompts.translate import (
    INVESTIGATE_SYSTEM,
    TRANSLATE_SYSTEM,
    build_investigate_prompt,
    build_translate_prompt,
)
from app.providers import get_provider

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword-based fallback query builder (kept from the original stub)
# ---------------------------------------------------------------------------

def _keyword_fallback(message: str) -> str:
    """Produce a best-effort DSL query from keywords when the LLM fails."""
    normalized = message.lower().strip()
    if "last hour" in normalized or "1 hour" in normalized:
        return json.dumps({"query": {"range": {"@timestamp": {"gte": "now-1h"}}}})
    if "24 hours" in normalized or "last 24 hours" in normalized:
        return json.dumps({"query": {"range": {"@timestamp": {"gte": "now-24h"}}}})
    if "7 days" in normalized or "last week" in normalized:
        return json.dumps({"query": {"range": {"@timestamp": {"gte": "now-168h"}}}})
    if "critical" in normalized or "rule.level 15" in normalized:
        return json.dumps({
            "query": {
                "bool": {
                    "must": [
                        {"range": {"@timestamp": {"gte": "now-24h"}}},
                        {"term": {"rule.level": 15}},
                    ]
                }
            }
        })
    if "high priority" in normalized or "high severity" in normalized:
        return json.dumps({
            "query": {
                "bool": {
                    "must": [
                        {"range": {"@timestamp": {"gte": "now-24h"}}},
                        {"range": {"rule.level": {"gte": 12}}},
                    ]
                }
            }
        })
    if "brute force" in normalized or "failed login" in normalized:
        return json.dumps({
            "query": {
                "bool": {
                    "must": [
                        {"range": {"@timestamp": {"gte": "now-24h"}}},
                        {"term": {"rule.mitre.technique": "T1110"}},
                    ]
                }
            }
        })
    # Generic fallback
    return json.dumps({
        "query": {
            "bool": {
                "must": [{"range": {"@timestamp": {"gte": "now-24h"}}}]
            }
        }
    })


def _extract_json_from_text(text: str) -> dict | list | None:
    """Try to pull the first valid JSON object or array from an LLM response."""
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?", "", text).strip()
    text = text.replace("```", "").strip()

    # Try the whole thing first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find first { ... } block
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    # Find first [ ... ] block
    bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
    if bracket_match:
        try:
            return json.loads(bracket_match.group())
        except json.JSONDecodeError:
            pass

    return None


def _build_explanation(dsl: dict) -> str:
    """Generate a human-readable explanation of an Elasticsearch DSL query."""
    parts: list[str] = []

    query_node = dsl.get("query", {})

    def _describe(node: dict) -> list[str]:
        desc: list[str] = []
        if "range" in node:
            for field, opts in node["range"].items():
                gte = opts.get("gte", "")
                lte = opts.get("lte", "now")
                desc.append(f"Filter on {field} from {gte} to {lte}")
        if "term" in node:
            for field, val in node["term"].items():
                desc.append(f"Exact match {field} = {val}")
        if "match" in node:
            for field, val in node["match"].items():
                desc.append(f"Full-text search on {field} for '{val}'")
        if "bool" in node:
            b = node["bool"]
            for clause in ("must", "filter", "should", "must_not"):
                if clause in b:
                    sub = b[clause]
                    if isinstance(sub, list):
                        for item in sub:
                            desc.extend(_describe(item))
                    else:
                        desc.extend(_describe(sub))
        if "match_all" in node:
            desc.append("Match all documents")
        return desc

    parts = _describe(query_node)

    size = dsl.get("size")
    if size is not None:
        parts.append(f"Return up to {size} results")

    sort = dsl.get("sort")
    if sort:
        parts.append("Results sorted as specified")

    if not parts:
        return "Elasticsearch DSL query generated from your natural-language request."

    return "Query filters: " + "; ".join(parts) + "."


# ---------------------------------------------------------------------------
# QueryTranslator
# ---------------------------------------------------------------------------


class QueryTranslator:
    """Translates natural-language security questions into Elastic DSL and
    produces structured investigation reports."""

    def __init__(self) -> None:
        self.provider = get_provider()

    @property
    def model_name(self) -> str:
        return self.provider.model_name

    async def translate(self, message: str) -> QueryPreview:
        """Call the LLM to convert *message* into an Elasticsearch DSL query.

        Falls back to keyword-based heuristics on any error.
        """
        try:
            raw = await self.provider.generate(
                build_translate_prompt(message), TRANSLATE_SYSTEM
            )
            parsed = _extract_json_from_text(raw)

            if parsed is None:
                raise ValueError("LLM returned no parseable JSON")

            # Provider may return {"query": ...} or a bare DSL dict
            if isinstance(parsed, dict) and "query" in parsed:
                dsl = parsed
            else:
                dsl = {"query": parsed}

            query_str = json.dumps(dsl)
            explanation = _build_explanation(dsl)
            summary = (
                "Query generated by the AI model and ready for review before execution."
            )

        except Exception as exc:
            logger.warning("LLM translation failed (%s); using keyword fallback.", exc)
            query_str = _keyword_fallback(message)
            explanation = (
                "Generated a baseline threat-hunting query from the user request using "
                "keyword heuristics (LLM unavailable). Review before execution."
            )
            summary = "Fallback query generated from keywords."

        return QueryPreview(
            query=query_str,
            summary=summary,
            explanation=explanation,
            model=self.model_name,
        )

    async def investigate(
        self,
        user_message: str,
        query: str,
        alerts: list,
    ) -> InvestigationResult:
        """Run an investigation analysis on *alerts* using the LLM."""
        from app.services.mitre import enrich_techniques

        try:
            prompt = build_investigate_prompt(
                user_message=user_message,
                query=query,
                alert_count=len(alerts),
                sample_alerts=alerts,
            )
            raw = await self.provider.generate(prompt, INVESTIGATE_SYSTEM)
            parsed = _extract_json_from_text(raw)

            if not isinstance(parsed, dict):
                raise ValueError("LLM investigation response was not a JSON object")

            summary = str(parsed.get("summary", "Investigation complete."))
            risk_score = int(parsed.get("risk_score", 50))
            risk_score = max(1, min(100, risk_score))
            confidence = str(parsed.get("confidence", "medium"))
            if confidence not in ("low", "medium", "high"):
                confidence = "medium"
            iocs = parsed.get("iocs", [])
            if not isinstance(iocs, list):
                iocs = []
            raw_techniques = parsed.get("mitre_techniques", [])
            if not isinstance(raw_techniques, list):
                raw_techniques = []
            mitre_techniques = enrich_techniques(raw_techniques)
            next_steps = parsed.get("next_steps", [])
            if not isinstance(next_steps, list):
                next_steps = []

        except Exception as exc:
            logger.warning("LLM investigation failed (%s); returning safe fallback.", exc)
            summary = (
                "Automated investigation could not be completed. "
                "Please review the alerts manually."
            )
            risk_score = 50
            confidence = "low"
            iocs = []
            mitre_techniques = []
            next_steps = [
                "Review the returned alerts manually.",
                "Check rule descriptions for patterns.",
                "Correlate source IPs against threat intelligence feeds.",
                "Escalate to senior analyst if high-severity alerts are present.",
            ]

        return InvestigationResult(
            summary=summary,
            risk_score=risk_score,
            confidence=confidence,
            iocs=iocs,
            mitre_techniques=mitre_techniques,
            next_steps=next_steps,
            model=self.model_name,
        )
