"""HuggingFace Inference API provider."""
from __future__ import annotations

import os
from typing import AsyncIterator

import httpx

from app.providers.base import LLMProvider

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_MODEL = os.getenv(
    "HF_MODEL",
    "VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF",
)
HF_API_BASE = "https://api-inference.huggingface.co/models"


class HuggingFaceProvider(LLMProvider):
    def __init__(
        self,
        model: str = HF_MODEL,
        api_token: str = HF_API_TOKEN,
    ) -> None:
        self._model = model
        self._headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(self, prompt: str, system: str = "") -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{HF_API_BASE}/{self._model}",
                headers=self._headers,
                json={
                    "inputs": full_prompt,
                    "parameters": {"max_new_tokens": 1024, "return_full_text": False},
                },
            )
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list) and data:
                return data[0].get("generated_text", "")
            return str(data)

    async def stream(self, prompt: str, system: str = "") -> AsyncIterator[str]:
        # HF Inference API doesn't support streaming for all models;
        # fall back to full generate and yield all at once.
        result = await self.generate(prompt, system)
        yield result
