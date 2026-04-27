"""
Provider-agnostic LLM client using OpenAI SDK.

Compatible with:
  - OpenRouter:   LLM_BASE_URL=https://openrouter.ai/api/v1
  - Gemini compat: LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
  - Groq:         LLM_BASE_URL=https://api.groq.com/openai/v1
  - OpenAI:       LLM_BASE_URL=https://api.openai.com/v1

Set env vars: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
"""
import os
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        base_url = os.getenv("LLM_BASE_URL", "https://openrouter.ai/api/v1")
        api_key = os.getenv("LLM_API_KEY", "")
        if not api_key:
            logger.warning("LLM_API_KEY not set — AI calls will fail")
        _client = AsyncOpenAI(base_url=base_url, api_key=api_key or "placeholder")
    return _client


async def call_llm(
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.3,
) -> str:
    """Call the configured LLM. Returns response text."""
    model = os.getenv("LLM_MODEL", "google/gemini-flash-1.5")
    client = get_client()

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are LegalDoc AI — an expert legal analyst, contract specialist, "
                        "and document assistant. Provide accurate, structured, professional responses. "
                        "Use clear headings and bullet points. Be thorough but concise."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        content = response.choices[0].message.content
        return content or ""
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise RuntimeError(f"AI service unavailable: {str(e)[:150]}")
