"""
Centralized configuration for KamiCode backend.
Reads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./kamicode.db"

    # Supabase Auth (Phase 1)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # AI Analysis
    openai_api_key: str = ""

    # Code Runner
    code_runner_mode: str = "local"  # "local" | "judge0"
    code_runner_timeout_sec: int = 5

    # Judge0 (if code_runner_mode == "judge0")
    judge0_base_url: str = "https://judge0-ce.p.rapidapi.com"
    judge0_api_key: str = ""
    judge0_api_host: str = "judge0-ce.p.rapidapi.com"

    # Server
    cors_origins: str = "*"  # comma-separated origins for production
    debug: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
