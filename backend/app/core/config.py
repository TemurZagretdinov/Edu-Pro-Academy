import json
from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = Field(
        default="Education Center CRM",
        validation_alias=AliasChoices("APP_NAME", "PROJECT_NAME"),
    )
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/education_center"
    # FRONTEND_ORIGINS is the production deployment name; CORS_ORIGINS remains supported for existing local env files.
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        validation_alias=AliasChoices("FRONTEND_ORIGINS", "CORS_ORIGINS"),
    )
    secret_key: str = "change-this-secret-in-production"
    access_token_expire_minutes: int = 720
    bootstrap_admin_email: str = "admin@edupro.uz"
    bootstrap_admin_password: str = "Admin12345"
    telegram_bot_token: str | None = None
    bot_username: str | None = None
    telegram_request_timeout_seconds: int = 10
    parent_bad_grade_threshold: int = 60
    parent_portal_url: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            raw_value = value.strip()
            if raw_value.startswith("["):
                parsed = json.loads(raw_value)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in raw_value.split(",") if origin.strip()]
        return value

    @field_validator("parent_bad_grade_threshold")
    @classmethod
    def validate_parent_bad_grade_threshold(cls, value: int) -> int:
        if not 0 <= value <= 100:
            raise ValueError("parent_bad_grade_threshold must be between 0 and 100")
        return value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
