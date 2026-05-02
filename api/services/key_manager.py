import os
import re
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


@dataclass
class KeySlot:
    index: int
    key: str
    client: AsyncOpenAI
    locked_until: float = field(default=0.0)

    @property
    def available(self) -> bool:
        return time.monotonic() >= self.locked_until

    def lock(self, seconds: float) -> None:
        self.locked_until = time.monotonic() + seconds
        logger.warning(
            "Key #%d (...%s) rate-limited — locked for %.0fs",
            self.index, self.key[-6:], seconds,
        )

    def seconds_until_available(self) -> float:
        return max(0.0, self.locked_until - time.monotonic())


class RateLimitExceeded(Exception):
    def __init__(self, wait_seconds: float) -> None:
        self.wait_seconds = wait_seconds
        mins = max(1, round(wait_seconds / 60))
        super().__init__(
            f"All API keys are currently rate-limited. "
            f"Please try again in about {mins} minute{'s' if mins != 1 else ''}."
        )


class KeyManager:
    """
    Manages up to 5 LLM API keys. Reads from env vars:
      LLM_API_KEY_1 … LLM_API_KEY_5
      LLM_API_KEY   (treated as key 1 if numbered keys not set)

    On rate-limit, locks the offending key for the duration reported by the API,
    then retries with the next available key. If all keys are locked, raises
    RateLimitExceeded with the shortest remaining wait time.
    """

    def __init__(self) -> None:
        self.slots: list[KeySlot] = []
        self._build_slots()

    def _build_slots(self) -> None:
        base_url = os.getenv("LLM_BASE_URL", "https://openrouter.ai/api/v1")
        seen: set[str] = set()

        candidates: list[tuple[int, str]] = []

        for i in range(1, 6):
            k = os.getenv(f"LLM_API_KEY_{i}", "").strip()
            if k:
                candidates.append((i, k))

        # Fall back to bare LLM_API_KEY as slot 1 if no numbered keys
        if not candidates:
            k = os.getenv("LLM_API_KEY", "").strip()
            if k:
                candidates.append((1, k))
        else:
            # Also pick up bare LLM_API_KEY if it differs from all numbered ones
            k = os.getenv("LLM_API_KEY", "").strip()
            if k and k not in {c[1] for c in candidates}:
                candidates.append((0, k))

        for idx, (slot_num, key) in enumerate(candidates):
            if key in seen:
                continue
            seen.add(key)
            client = AsyncOpenAI(base_url=base_url, api_key=key)
            self.slots.append(KeySlot(index=slot_num or idx + 1, key=key, client=client))

        if not self.slots:
            logger.error("No LLM API keys found in environment")
        else:
            logger.info("KeyManager loaded %d key(s)", len(self.slots))

    def get_available(self) -> Optional[KeySlot]:
        for slot in self.slots:
            if slot.available:
                return slot
        return None

    def all_locked(self) -> bool:
        return all(not s.available for s in self.slots)

    def min_wait_seconds(self) -> float:
        if not self.slots:
            return 60.0
        return min(s.seconds_until_available() for s in self.slots)

    def status(self) -> list[dict]:
        now = time.monotonic()
        return [
            {
                "index": s.index,
                "available": s.available,
                "locked_for_seconds": round(max(0.0, s.locked_until - now)),
            }
            for s in self.slots
        ]


def parse_retry_after(exc: Exception) -> float:
    """
    Extract the retry-after duration (seconds) from an OpenAI RateLimitError.
    Falls back to 60 seconds if no header or parseable message is found.
    """
    # Try the response headers first (most reliable)
    try:
        headers = exc.response.headers  # type: ignore[attr-defined]
        val = headers.get("retry-after") or headers.get("x-ratelimit-reset-requests")
        if val:
            return float(val)
    except Exception:
        pass

    # Try parsing the error message: "Please try again in 45s" / "in 1m30s"
    msg = str(exc)
    m = re.search(r"try again in\s+([\d.]+)s", msg, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r"try again in\s+(\d+)m(\d+(?:\.\d+)?)s", msg, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 60 + float(m.group(2))
    m = re.search(r"try again in\s+(\d+)\s*minute", msg, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 60

    return 60.0


_manager: Optional[KeyManager] = None


def get_manager() -> KeyManager:
    global _manager
    if _manager is None:
        _manager = KeyManager()
    return _manager
