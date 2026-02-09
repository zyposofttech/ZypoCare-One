"""In-memory chat session store.

Maintains conversation history for the co-pilot chat.
Sessions expire after 30 minutes of inactivity.
Maximum 20 messages per session.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)
    source: str | None = None  # "ollama" | "keyword_match" | "heuristic"


@dataclass
class ChatSession:
    session_id: str
    messages: list[ChatMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)

    MAX_MESSAGES = 20
    TTL_SECONDS = 30 * 60  # 30 minutes

    def add_message(self, role: str, content: str, source: str | None = None) -> None:
        self.messages.append(ChatMessage(role=role, content=content, source=source))
        self.last_activity = time.time()
        # Trim old messages if over limit
        if len(self.messages) > self.MAX_MESSAGES:
            self.messages = self.messages[-self.MAX_MESSAGES:]

    def is_expired(self) -> bool:
        return time.time() - self.last_activity > self.TTL_SECONDS

    def get_history_text(self) -> str:
        """Return conversation history as a formatted string for LLM context."""
        lines = []
        for msg in self.messages[-10:]:  # Last 10 messages for context
            prefix = "User" if msg.role == "user" else "Assistant"
            lines.append(f"{prefix}: {msg.content}")
        return "\n".join(lines)


class ChatSessionStore:
    """In-memory session store with TTL cleanup."""

    def __init__(self) -> None:
        self._sessions: dict[str, ChatSession] = {}

    def create_or_resume(self, session_id: str | None = None) -> ChatSession:
        """Get existing session or create new one."""
        self._cleanup_expired()

        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            if not session.is_expired():
                return session
            # Expired — remove it
            del self._sessions[session_id]

        # Create new session
        new_id = session_id or str(uuid.uuid4())
        session = ChatSession(session_id=new_id)
        self._sessions[new_id] = session
        return session

    def get(self, session_id: str) -> ChatSession | None:
        session = self._sessions.get(session_id)
        if session and not session.is_expired():
            return session
        return None

    def _cleanup_expired(self) -> None:
        """Remove expired sessions (called periodically)."""
        expired = [
            sid for sid, s in self._sessions.items() if s.is_expired()
        ]
        for sid in expired:
            del self._sessions[sid]


# Singleton
chat_store = ChatSessionStore()
