from dataclasses import dataclass

from app.models import QueryPreview


DEFAULT_MODEL = "VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF"


@dataclass
class QueryTranslator:
    model_name: str = DEFAULT_MODEL

    def translate(self, message: str) -> QueryPreview:
        normalized = message.lower().strip()
        if "24 hours" in normalized or "last 24 hours" in normalized:
            query = '{"query":{"range":{"@timestamp":{"gte":"now-24h"}}}}'
        elif "high priority" in normalized or "critical" in normalized:
            query = '{"query":{"term":{"rule.level":10}}}'
        else:
            query = '{"query":{"match_all":{}}}'

        explanation = (
            "Generated a baseline threat-hunting query from the user request and "
            "kept it transparent for review before execution."
        )
        summary = "Preview generated successfully. Execution will be added in the next milestone."
        return QueryPreview(
            query=query,
            summary=summary,
            explanation=explanation,
            model=self.model_name,
        )
