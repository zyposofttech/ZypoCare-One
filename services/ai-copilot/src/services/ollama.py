"""Ollama HTTP client — local LLM gateway.

Wraps the Ollama REST API (default: http://localhost:11434).
Features:
  - Health check with 60-second caching
  - Graceful degradation when Ollama is down
  - Structured JSON mode
  - Configurable model, temperature, context window
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from src.config import (
    OLLAMA_BASE_URL,
    OLLAMA_CONTEXT_WINDOW,
    OLLAMA_MODEL,
    OLLAMA_TEMPERATURE,
    OLLAMA_TIMEOUT,
)

logger = logging.getLogger("ai-copilot.ollama")

HEALTH_CHECK_INTERVAL = 60  # seconds


@dataclass
class OllamaResponse:
    available: bool
    text: str = ""
    json_data: dict[str, Any] | None = None
    model: str = ""
    duration_ms: int = 0
    token_count: int = 0
    error: str | None = None


@dataclass
class OllamaService:
    base_url: str = field(default_factory=lambda: OLLAMA_BASE_URL)
    model: str = field(default_factory=lambda: OLLAMA_MODEL)
    timeout: int = field(default_factory=lambda: OLLAMA_TIMEOUT)
    temperature: float = field(default_factory=lambda: OLLAMA_TEMPERATURE)
    context_window: int = field(default_factory=lambda: OLLAMA_CONTEXT_WINDOW)

    _is_available: bool | None = field(default=None, init=False, repr=False)
    _last_health_check: float = field(default=0.0, init=False, repr=False)

    # ── Health ─────────────────────────────────────────────────────────

    async def check_health(self) -> bool:
        now = time.time()
        if (
            self._is_available is not None
            and now - self._last_health_check < HEALTH_CHECK_INTERVAL
        ):
            return self._is_available

        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                self._is_available = True
                self._last_health_check = now

                has_model = any(m.startswith(self.model) for m in models)
                if not has_model and models:
                    logger.warning(
                        'Model "%s" not found. Available: %s. Run: ollama pull %s',
                        self.model,
                        ", ".join(models),
                        self.model,
                    )
                return True
        except Exception:
            pass

        self._is_available = False
        self._last_health_check = now
        return False

    @property
    def available(self) -> bool:
        return self._is_available is True

    # ── Generate ───────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system: str | None = None,
        *,
        use_json: bool = False,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> OllamaResponse:
        is_up = await self.check_health()
        if not is_up:
            return OllamaResponse(
                available=False,
                model=self.model,
                error=f"Ollama not available. Install from https://ollama.ai and run: ollama pull {self.model}",
            )

        start = time.time()
        body: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature if temperature is not None else self.temperature,
                "num_ctx": self.context_window,
            },
        }
        if system:
            body["system"] = system
        if use_json:
            body["format"] = "json"
        if max_tokens:
            body["options"]["num_predict"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json=body,
                )

            elapsed = int((time.time() - start) * 1000)

            if resp.status_code != 200:
                return OllamaResponse(
                    available=True,
                    model=self.model,
                    duration_ms=elapsed,
                    error=f"Ollama error {resp.status_code}: {resp.text}",
                )

            data = resp.json()
            text = (data.get("response") or "").strip()
            json_data: dict[str, Any] | None = None

            if use_json:
                try:
                    json_data = json.loads(text)
                except json.JSONDecodeError:
                    match = re.search(r"\{[\s\S]*\}", text)
                    if match:
                        try:
                            json_data = json.loads(match.group(0))
                        except json.JSONDecodeError:
                            logger.warning("Failed to parse JSON from Ollama response")

            return OllamaResponse(
                available=True,
                text=text,
                json_data=json_data,
                model=self.model,
                duration_ms=elapsed,
                token_count=data.get("eval_count", 0),
            )

        except httpx.TimeoutException:
            elapsed = int((time.time() - start) * 1000)
            return OllamaResponse(
                available=True,
                model=self.model,
                duration_ms=elapsed,
                error=f"Request timed out after {self.timeout}s",
            )
        except Exception as exc:
            elapsed = int((time.time() - start) * 1000)
            return OllamaResponse(
                available=True,
                model=self.model,
                duration_ms=elapsed,
                error=f"Ollama request failed: {exc}",
            )

    # ── Convenience: generate JSON ─────────────────────────────────────

    async def generate_json(
        self,
        system: str,
        prompt: str,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        """Returns {available, data, error, duration_ms}."""
        resp = await self.generate(
            prompt, system, use_json=True, temperature=temperature
        )
        return {
            "available": resp.available,
            "data": resp.json_data,
            "error": resp.error,
            "duration_ms": resp.duration_ms,
        }

    # ── Convenience: generate text ─────────────────────────────────────

    async def generate_text(
        self,
        system: str,
        prompt: str,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        """Returns {available, text, error, duration_ms}."""
        resp = await self.generate(
            prompt, system, use_json=False, temperature=temperature
        )
        return {
            "available": resp.available,
            "text": resp.text,
            "error": resp.error,
            "duration_ms": resp.duration_ms,
        }


# Singleton — import this from anywhere
ollama_service = OllamaService()
