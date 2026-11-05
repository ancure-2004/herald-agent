from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
MONOREPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server & Environment
    PROJECT_NAME: str = Field(default="Personal OS & CRM", description="Project application name")
    API_V1_STR: str = Field(default="/api/v1", description="API v1 prefix")
    ENVIRONMENT: str = Field(
        default="development", description="Runtime environment: development | staging | production"
    )
    DEBUG: bool = Field(default=True, description="Debug mode flag")
    HOST: str = Field(default="0.0.0.0", description="Host interface to bind")
    PORT: int = Field(default=8000, description="Port to listen on")

    # Security & Networking
    SECRET_KEY: str = Field(
        default="dev-insecure-secret-key-change-in-production-32b", description="Secret key for signing/tokens"
    )
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
        description="Allowed CORS origin domains",
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", "0.0.0.0", "testserver"],
        description="Allowed host headers",
    )
    MAX_REQUEST_BODY_SIZE: int = Field(
        default=10 * 1024 * 1024,
        description="Maximum accepted request body size in bytes (10MB default)",
    )

    # Database
    DATABASE_URL: str = Field(
        default=f"sqlite:///{BACKEND_DIR / 'personal_os.db'}",
        description="Primary SQLAlchemy database connection string",
    )
    DIRECT_URL: Optional[str] = Field(
        default=None,
        description="Direct database connection string for serverless pooler bypass",
    )

    # Demo Engine & Outreach Defaults
    DEMO_ENGINE_BASE_URL: str = Field(
        default="http://localhost:3001",
        description="Base URL for the Next.js 3-template Dental Clinic Engine",
    )
    DEFAULT_DEAL_VALUE_INR: int = Field(default=15000, description="Default deal value in INR")

    # Engine Directories
    DENTAL_ENGINE_DIR: Path = Field(
        default=MONOREPO_ROOT / "engines" / "dental-clinic-engine",
        description="Path to Dental Clinic Engine directory",
    )
    DENTAL_RECORDER_DIR: Path = Field(
        default=MONOREPO_ROOT / "engines" / "dental-batch-recorder",
        description="Path to Dental Batch Recorder directory",
    )

    # External APIs (Optional in development, graceful fallback to mock/deterministic)
    GOOGLE_PLACES_API_KEY: Optional[str] = Field(default=None, description="Google Places API Key for clinic discovery")
    BRAVE_API_KEY: Optional[str] = Field(default=None, description="Brave Search API Key for domain & website checks")
    SERPER_API_KEY: Optional[str] = Field(default=None, description="Serper Google Search API Key")
    GEMINI_API_KEY: Optional[str] = Field(
        default=None, description="Google Gemini API Key for copilot & research notes"
    )
    GROQ_API_KEY: Optional[str] = Field(default=None, description="Groq API Key for fast LLM inferences")
    TELEGRAM_BOT_TOKEN: Optional[str] = Field(default=None, description="Telegram Bot Token for away alerts")
    TELEGRAM_CHAT_ID: Optional[str] = Field(default=None, description="Telegram Chat ID for notifications")

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = Field(default="120/minute", description="Default rate limit per client IP")
    RATE_LIMIT_EXPENSIVE: str = Field(default="20/minute", description="Stricter rate limit for expensive/write ops")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: object) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: object) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["localhost", "127.0.0.1", "0.0.0.0", "testserver"]

    @field_validator("DENTAL_ENGINE_DIR", "DENTAL_RECORDER_DIR", mode="before")
    @classmethod
    def assemble_engine_paths(cls, v: object) -> Path:
        if isinstance(v, (str, Path)):
            return Path(v).resolve()
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return list(self.CORS_ORIGINS)

    @property
    def allowed_hosts_list(self) -> List[str]:
        return list(self.ALLOWED_HOSTS)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg2://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
