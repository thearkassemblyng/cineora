from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV_FILE), ".env"),
        extra="ignore",
    )

    service_name: str = "cineora-ai-orchestrator"
    version: str = "0.1.0"
    ai_default_mode: str = "DEMO"
    internal_service_token: str = ""

    # Server-side AI provider API keys (never hardcoded)
    google_veo_api_key: str = ""
    runway_api_key: str = ""
    kling_api_key: str = ""
    luma_api_key: str = ""
    elevenlabs_api_key: str = ""
    openai_api_key: str = ""


settings = Settings()
