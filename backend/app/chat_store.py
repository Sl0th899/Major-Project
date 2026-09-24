from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import RLock
from uuid import UUID, uuid4

from .config import settings
from .models import Conversation, Message
from .security import new_session_id


class SessionNotFound(Exception):
    pass


@dataclass
class _Session:
    expires_at: datetime
    conversations: dict[UUID, Conversation] = field(default_factory=dict)
    messages: dict[UUID, list[Message]] = field(default_factory=dict)


class ChatStore:
    def __init__(self) -> None:
        self._sessions: dict[str, _Session] = {}
        self._lock = RLock()
        self._creation_window_started = datetime.now(timezone.utc)
        self._creation_count = 0

    def create_session(self) -> tuple[str, datetime]:
        with self._lock:
            self._purge_expired()
            now = datetime.now(timezone.utc)
            if now - self._creation_window_started >= timedelta(minutes=1):
                self._creation_window_started = now
                self._creation_count = 0
            if self._creation_count >= settings.max_session_creations_per_minute:
                raise RuntimeError("session creation rate reached")
            if len(self._sessions) >= settings.max_active_sessions:
                raise RuntimeError("session capacity reached")
            session_id = new_session_id()
            expires_at = now + timedelta(seconds=settings.anonymous_session_ttl_seconds)
            self._sessions[session_id] = _Session(expires_at=expires_at)
            self._creation_count += 1
            return session_id, expires_at

    def delete_session(self, session_id: str) -> bool:
        with self._lock:
            self._purge_expired()
            return self._sessions.pop(session_id, None) is not None

    def create_conversation(self, session_id: str, title: str | None) -> Conversation:
        session = self._require_session(session_id)
        conversation_id = uuid4()
        now = datetime.now(timezone.utc)
        conversation = Conversation(id=conversation_id, title=title or "New conversation", created_at=now, updated_at=now)
        session.conversations[conversation_id] = conversation
        session.messages[conversation_id] = []
        return conversation

    def list_conversations(self, session_id: str) -> list[Conversation]:
        session = self._require_session(session_id)
        return sorted(session.conversations.values(), key=lambda item: item.updated_at, reverse=True)

    def get_conversation(self, session_id: str, conversation_id: UUID) -> Conversation | None:
        session = self._require_session(session_id)
        return session.conversations.get(conversation_id)

    def delete_conversation(self, session_id: str, conversation_id: UUID) -> bool:
        session = self._require_session(session_id)
        if session.conversations.pop(conversation_id, None) is None:
            return False
        session.messages.pop(conversation_id, None)
        return True

    def add_message(self, session_id: str, conversation_id: UUID, role: str, content: str) -> Message | None:
        session = self._require_session(session_id)
        if conversation_id not in session.conversations:
            return None
        messages = session.messages[conversation_id]
        if len(messages) >= settings.max_messages_per_session:
            raise ValueError("conversation message limit reached")
        message_id = uuid4()
        now = datetime.now(timezone.utc)
        message = Message(id=message_id, conversation_id=conversation_id, role=role, content=content, created_at=now)
        messages.append(message)
        session.conversations[conversation_id] = session.conversations[conversation_id].model_copy(update={"updated_at": now})
        return message

    def list_messages(self, session_id: str, conversation_id: UUID, limit: int = 100) -> list[Message] | None:
        session = self._require_session(session_id)
        if conversation_id not in session.conversations:
            return None
        return session.messages[conversation_id][-limit:]

    def _require_session(self, session_id: str) -> _Session:
        with self._lock:
            self._purge_expired()
            session = self._sessions.get(session_id)
            if session is None:
                raise SessionNotFound
            return session

    def _purge_expired(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [session_id for session_id, session in self._sessions.items() if session.expires_at <= now]
        for session_id in expired:
            del self._sessions[session_id]
