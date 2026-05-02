import os
import logging

import openai

from services.key_manager import get_manager, parse_retry_after, RateLimitExceeded

logger = logging.getLogger(__name__)


async def call_llm(
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.3,
) -> str:
    model = os.getenv("LLM_MODEL", "google/gemini-flash-1.5")
    manager = get_manager()

    attempts = len(manager.slots) if manager.slots else 1

    for _ in range(attempts):
        if manager.all_locked():
            break

        slot = manager.get_available()
        if slot is None:
            break

        try:
            response = await slot.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are LegalDoc AI — an expert legal analyst, contract specialist, "
                            "and document assistant specialising in Indian law. Provide accurate, "
                            "structured, professional responses. Use clear headings and bullet points. "
                            "Be thorough but concise."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""

        except openai.RateLimitError as exc:
            wait = parse_retry_after(exc)
            slot.lock(wait)

        except Exception as exc:
            logger.error("LLM call failed on key #%d: %s", slot.index, exc)
            raise RuntimeError(f"AI service error: {str(exc)[:200]}")

    wait = manager.min_wait_seconds()
    raise RateLimitExceeded(wait_seconds=wait)
