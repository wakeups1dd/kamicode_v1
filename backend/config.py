"""
Centralized configuration for KamiCode backend.
Reads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./kamicode.db"

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    bypass_auth: bool = False

    # Convex DB
    convex_url: str = ""

    # AI Analysis
    openai_api_key: str = ""

    # Code Runner
    code_runner_mode: str = "local"  # "local" | "judge0"
    code_runner_timeout_sec: int = 5

    # Judge0 (if code_runner_mode == "judge0")
    judge0_base_url: str = "https://judge0-ce.p.rapidapi.com"
    judge0_api_key: str = ""
    judge0_api_host: str = "judge0-ce.p.rapidapi.com"

    # Piston (if code_runner_mode == "piston")
    piston_base_url: str = "https://emkc.org/api/v2/piston"

    # JDoodle (if code_runner_mode == "jdoodle")
    jdoodle_client_id: str = ""
    jdoodle_client_secret: str = ""

    # Server
    cors_origins: str = "*"  # comma-separated origins for production
    debug: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
