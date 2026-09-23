import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    ai_model: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    ai_timeout_seconds: float = float(os.getenv("AI_TIMEOUT_SECONDS", "20"))
    allowed_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
        if origin.strip()
    )
    allow_credentials: bool = False
    anonymous_session_ttl_seconds: int = int(os.getenv("ANONYMOUS_SESSION_TTL_SECONDS", "3600"))
    max_active_sessions: int = int(os.getenv("MAX_ACTIVE_SESSIONS", "1000"))
    max_session_creations_per_minute: int = int(os.getenv("MAX_SESSION_CREATIONS_PER_MINUTE", "120"))
    max_messages_per_session: int = int(os.getenv("MAX_MESSAGES_PER_SESSION", "100"))
    max_history_messages: int = int(os.getenv("MAX_HISTORY_MESSAGES", "20"))
    enable_api_docs: bool = os.getenv("ENABLE_API_DOCS", "false").lower() == "true"


settings = Settings()
