from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from .database import connect
from .models import Conversation, Message, PublicUser
from .security import hash_password, new_token, verify_password


class DuplicateEmailError(Exception):
    pass


class ChatStore:
    def create_user(self, email: str, password: str) -> PublicUser:
        user_id = uuid4()
        created_at = datetime.now(timezone.utc)
        try:
            with connect() as connection:
                connection.execute(
                    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (str(user_id), email, hash_password(password), created_at.isoformat()),
                )
        except Exception as exc:
            if "UNIQUE constraint failed: users.email" in str(exc):
                raise DuplicateEmailError from exc
            raise
        return PublicUser(id=user_id, email=email, created_at=created_at)

    def authenticate(self, email: str, password: str) -> PublicUser | None:
        with connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None or not verify_password(password, row["password_hash"]):
            return None
        return PublicUser(id=UUID(row["id"]), email=row["email"], created_at=datetime.fromisoformat(row["created_at"]))

    def issue_token(self, user_id: UUID, ttl_hours: int) -> str:
        token = new_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
        with connect() as connection:
            connection.execute("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)", (token, str(user_id), expires_at.isoformat()))
        return token

    def user_for_token(self, token: str) -> PublicUser | None:
        now = datetime.now(timezone.utc).isoformat()
        with connect() as connection:
            row = connection.execute(
                "SELECT users.* FROM auth_tokens JOIN users ON users.id = auth_tokens.user_id WHERE auth_tokens.token = ? AND auth_tokens.expires_at > ?",
                (token, now),
            ).fetchone()
        if row is None:
            return None
        return PublicUser(id=UUID(row["id"]), email=row["email"], created_at=datetime.fromisoformat(row["created_at"]))

    def revoke_token(self, token: str) -> None:
        with connect() as connection:
            connection.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))

    def create_conversation(self, user_id: UUID, title: str | None) -> Conversation:
        conversation_id = uuid4()
        now = datetime.now(timezone.utc)
        with connect() as connection:
            connection.execute(
                "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (str(conversation_id), str(user_id), title or "New conversation", now.isoformat(), now.isoformat()),
            )
        return Conversation(id=conversation_id, title=title or "New conversation", created_at=now, updated_at=now)

    def list_conversations(self, user_id: UUID) -> list[Conversation]:
        with connect() as connection:
            rows = connection.execute("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", (str(user_id),)).fetchall()
        return [self._conversation(row) for row in rows]

    def get_conversation(self, user_id: UUID, conversation_id: UUID) -> Conversation | None:
        with connect() as connection:
            row = connection.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (str(conversation_id), str(user_id))).fetchone()
        return self._conversation(row) if row else None

    def delete_conversation(self, user_id: UUID, conversation_id: UUID) -> bool:
        with connect() as connection:
            cursor = connection.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (str(conversation_id), str(user_id)))
        return cursor.rowcount == 1

    def add_message(self, user_id: UUID, conversation_id: UUID, role: str, content: str) -> Message | None:
        message_id = uuid4()
        now = datetime.now(timezone.utc)
        with connect() as connection:
            owned = connection.execute("SELECT 1 FROM conversations WHERE id = ? AND user_id = ?", (str(conversation_id), str(user_id))).fetchone()
            if owned is None:
                return None
            connection.execute("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)", (str(message_id), str(conversation_id), role, content, now.isoformat()))
            connection.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now.isoformat(), str(conversation_id)))
        return Message(id=message_id, conversation_id=conversation_id, role=role, content=content, created_at=now)

    def list_messages(self, user_id: UUID, conversation_id: UUID, limit: int = 100) -> list[Message] | None:
        with connect() as connection:
            owned = connection.execute("SELECT 1 FROM conversations WHERE id = ? AND user_id = ?", (str(conversation_id), str(user_id))).fetchone()
            if owned is None:
                return None
            rows = connection.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at LIMIT ?", (str(conversation_id), limit)).fetchall()
        return [Message(id=UUID(row["id"]), conversation_id=UUID(row["conversation_id"]), role=row["role"], content=row["content"], created_at=datetime.fromisoformat(row["created_at"])) for row in rows]

    @staticmethod
    def _conversation(row) -> Conversation:
        return Conversation(id=UUID(row["id"]), title=row["title"], created_at=datetime.fromisoformat(row["created_at"]), updated_at=datetime.fromisoformat(row["updated_at"]))
