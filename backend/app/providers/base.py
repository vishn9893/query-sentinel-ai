"""Abstract base class for all LLM providers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    """All providers implement this interface."""

    @abstractmethod
    async def generate(self, prompt: str, system: str = "") -> str:
        """Return a full completion string."""

    @abstractmethod
    async def stream(self, prompt: str, system: str = "") -> AsyncIterator[str]:
        """Yield completion tokens as they arrive."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Human-readable model identifier."""
