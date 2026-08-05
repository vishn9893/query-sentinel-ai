"""Async retry decorator factory."""
from __future__ import annotations

import asyncio
import functools
import logging
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    exceptions: tuple[type[Exception], ...] = (Exception,),
) -> Callable:
    """Async decorator factory that retries up to *max_attempts* times.

    Args:
        max_attempts: Maximum number of total attempts (including the first).
        delay: Seconds to wait between attempts.
        exceptions: Tuple of exception types that trigger a retry. Any other
            exception propagates immediately.

    Usage::

        @async_retry(max_attempts=3, delay=2.0, exceptions=(httpx.HTTPError,))
        async def call_api() -> dict:
            ...
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as exc:  # type: ignore[misc]
                    last_exc = exc
                    if attempt < max_attempts:
                        logger.warning(
                            "Attempt %d/%d for %s failed: %s — retrying in %.1fs",
                            attempt,
                            max_attempts,
                            func.__qualname__,
                            exc,
                            delay,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            "All %d attempts for %s failed. Last error: %s",
                            max_attempts,
                            func.__qualname__,
                            exc,
                        )
            raise last_exc  # type: ignore[misc]

        return wrapper

    return decorator
