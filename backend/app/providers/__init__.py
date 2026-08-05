"""Provider factory — reads LLM_PROVIDER env var and returns the right provider."""
from __future__ import annotations

import os

from app.providers.base import LLMProvider


def get_provider() -> LLMProvider:
    provider_name = os.getenv("LLM_PROVIDER", "ollama").lower()

    if provider_name == "huggingface":
        from app.providers.huggingface import HuggingFaceProvider
        return HuggingFaceProvider()

    # Default: Ollama
    from app.providers.ollama import OllamaProvider
    return OllamaProvider()
