"""Centralised configuration — reads from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from service root (services/ai-copilot/.env)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path, override=False)


_raw_db_url: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/zypocare",
)
# Strip Prisma-specific ?schema=public (asyncpg doesn't understand it)
DATABASE_URL: str = _raw_db_url.split("?")[0] if "?schema=" in _raw_db_url else _raw_db_url

# Ollama (local LLM)
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral:7b")
OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "120"))  # seconds
OLLAMA_TEMPERATURE: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.3"))
OLLAMA_CONTEXT_WINDOW: int = int(os.getenv("OLLAMA_CONTEXT_WINDOW", "4096"))

# Service
CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "http://localhost:3000")
