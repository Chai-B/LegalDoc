"""Text cleanup and validation helpers for legal tool requests."""
import re


def clean_text(text: str) -> str:
    """Normalize whitespace without changing the document's words."""
    return re.sub(r"\s+", " ", text or "").strip()


def require_text(text: str, min_chars: int = 80, label: str = "Text") -> str:
    """Return cleaned text or raise a client-safe validation error."""
    cleaned = clean_text(text)
    if len(cleaned) < min_chars:
        raise ValueError(f"{label} must contain at least {min_chars} characters.")
    return cleaned
