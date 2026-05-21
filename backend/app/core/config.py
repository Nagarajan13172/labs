"""Typed application settings, loaded once and validated at startup."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # App
    app_name: str = "Youngstorage API"
    environment: Literal["development", "production"] = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "youngstorage"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # MQTT (RabbitMQ)
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str = "guest"
    mqtt_password: str = "guest"

    # JWT
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_minutes: int = 60 * 24 * 7
    email_token_expire_minutes: int = 30
    reset_token_expire_minutes: int = 15

    # Email
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "no-reply@youngstorage.in"
    mail_from_name: str = "Youngstorage"
    mail_server: str = "localhost"
    mail_port: int = 1025
    mail_starttls: bool = False
    mail_ssl_tls: bool = False
    mail_use_credentials: bool = False
    mail_validate_certs: bool = False
    frontend_url: str = "http://localhost:3000"

    # Auth policy
    allowed_email_domains: Annotated[list[str], NoDecode] = Field(default_factory=list)

    # Labs (Phase 2: container provisioning)
    lab_base_image: str = "codercom/code-server:latest"
    lab_network_name: str = "youngstorage_labs"
    lab_network_subnet: str = "172.30.0.0/24"
    lab_internal_port: int = 8080  # code-server listens here
    lab_mem_limit: str = "2g"
    lab_cpus: float = 1.0
    lab_home_path: str = "/home/coder"

    @field_validator("cors_origins", "allowed_email_domains", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Allow comma-separated env strings for list fields."""
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
