from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: SecretStr
    environment: str = "development"
    cors_origins: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://thiago-code-lab.github.io",
    ]
    session_minutes: int = Field(default=60, ge=5, le=1440)
    login_limit: int = Field(default=5, ge=2, le=30)
    login_window_seconds: int = Field(default=600, ge=10, le=3600)
    request_limit: int = Field(default=180, ge=10, le=10000)
    max_payload_bytes: int = Field(default=1_100_000, ge=1024, le=5_000_000)
    demo_path: Path = Path(__file__).resolve().parents[3] / "public/data/demo.json"

    @field_validator("database_url")
    @classmethod
    def require_postgres(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().startswith("postgresql+psycopg://"):
            raise ValueError("Use uma conexão postgresql+psycopg configurada localmente.")
        return value

    @field_validator("cors_origins")
    @classmethod
    def explicit_origins(cls, values: list[str]) -> list[str]:
        if not values or any(
            v == "*" or not v.startswith(("http://", "https://")) or v.endswith("/") for v in values
        ):
            raise ValueError("CORS exige origens HTTP(S) explícitas, sem barra final.")
        return values


@lru_cache
def get_settings() -> Settings:
    return Settings()
