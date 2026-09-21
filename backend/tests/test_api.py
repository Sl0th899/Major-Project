import os
from pathlib import Path
from uuid import uuid4

os.environ["DATABASE_PATH"] = str(Path(__file__).with_name("test.sqlite3"))
try:
    Path(os.environ["DATABASE_PATH"]).unlink()
except FileNotFoundError:
    pass

from fastapi.testclient import TestClient

from backend.app import main


class FakeAI:
    def reply(self, history, content):
        return f"I hear you: {content}"


client = TestClient(main.app)


def register(email: str) -> dict:
    response = client.post("/auth/register", json={"email": email, "password": "correct horse"})
    assert response.status_code == 201
    return response.json()


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_and_authentication():
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/auth/me").status_code == 401
    account = register(f"{uuid4()}@example.com")
    response = client.get("/auth/me", headers=auth(account["access_token"]))
    assert response.status_code == 200
    assert "password" not in response.json()


def test_conversation_ownership_and_cascade():
    owner = register(f"{uuid4()}@example.com")
    other = register(f"{uuid4()}@example.com")
    created = client.post("/conversations", headers=auth(owner["access_token"]), json={"title": "A check-in"})
    conversation_id = created.json()["id"]

    assert client.get(f"/conversations/{conversation_id}", headers=auth(other["access_token"])).status_code == 404
    assert client.get(f"/conversations/{conversation_id}/messages", headers=auth(other["access_token"])).status_code == 404
    assert client.delete(f"/conversations/{conversation_id}", headers=auth(owner["access_token"])).status_code == 204
    assert client.get(f"/conversations/{conversation_id}", headers=auth(owner["access_token"])).status_code == 404


def test_chat_persists_user_and_assistant_messages():
    main.ai_provider = FakeAI()
    account = register(f"{uuid4()}@example.com")
    created = client.post("/conversations", headers=auth(account["access_token"]), json={})
    conversation_id = created.json()["id"]

    response = client.post(f"/conversations/{conversation_id}/messages", headers=auth(account["access_token"]), json={"content": "I had a hard day."})
    assert response.status_code == 200
    assert response.json()["assistant_message"]["content"] == "I hear you: I had a hard day."
    messages = client.get(f"/conversations/{conversation_id}/messages", headers=auth(account["access_token"]))
    assert [item["role"] for item in messages.json()] == ["user", "assistant"]


def test_blank_message_is_rejected_and_ai_failure_is_controlled():
    account = register(f"{uuid4()}@example.com")
    created = client.post("/conversations", headers=auth(account["access_token"]), json={})
    conversation_id = created.json()["id"]
    assert client.post(f"/conversations/{conversation_id}/messages", headers=auth(account["access_token"]), json={"content": "   "}).status_code == 422

    class BrokenAI:
        def reply(self, history, content):
            raise main.AIUnavailable

    main.ai_provider = BrokenAI()
    response = client.post(f"/conversations/{conversation_id}/messages", headers=auth(account["access_token"]), json={"content": "Please respond"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AI_UNAVAILABLE"
