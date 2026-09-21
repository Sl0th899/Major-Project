import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_path: str = os.getenv("DATABASE_PATH", "cat_therapist.db")
    ai_api_key: str | None = os.getenv("AI_API_KEY") or None
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    ai_model: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    ai_timeout_seconds: float = float(os.getenv("AI_TIMEOUT_SECONDS", "20"))
    allowed_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
        if origin.strip()
    )
    allow_credentials: bool = os.getenv("ALLOW_CREDENTIALS", "true").lower() == "true"
    token_ttl_hours: int = int(os.getenv("TOKEN_TTL_HOURS", "24"))


settings = Settings()
