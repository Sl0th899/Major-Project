from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import main


SECRET_KEY = "sk-test-never-persist-this"


class FakeAI:
    def __init__(self) -> None:
        self.validated_keys: list[str] = []
        self.used_keys: list[str] = []

    def validate_key(self, api_key: str) -> None:
        self.validated_keys.append(api_key)
        if api_key == "invalid":
            raise main.AIKeyInvalid

    def reply(self, api_key, history, content):
        self.used_keys.append(api_key)
        return f"I hear you: {content}"


client = TestClient(main.app)


def key_headers(key: str = SECRET_KEY) -> dict[str, str]:
    return {"X-Provider-API-Key": key}


def session_headers(session_id: str, key: str = SECRET_KEY) -> dict[str, str]:
    return {"X-Anonymous-Session": session_id, "X-Provider-API-Key": key}


def create_session(key: str = SECRET_KEY) -> dict:
    response = client.post("/chat/sessions", headers=key_headers(key))
    assert response.status_code == 201
    return response.json()


def test_health_and_account_routes_are_removed():
    assert client.get("/health").json() == {"status": "ok"}
    assert client.post("/auth/register", json={"email": "a@example.com", "password": "password"}).status_code == 404
    assert client.post("/auth/login", json={"email": "a@example.com", "password": "password"}).status_code == 404
    assert client.get("/auth/me").status_code == 404
    assert client.post("/auth/logout").status_code == 404


def test_key_validation_creates_anonymous_session_without_returning_key():
    fake_ai = FakeAI()
    main.ai_provider = fake_ai

    response = client.post("/chat/sessions", headers=key_headers())

    assert response.status_code == 201
    body = response.json()
    assert len(body["session_id"]) >= 40
    assert SECRET_KEY not in response.text
    assert fake_ai.validated_keys == [SECRET_KEY]


def test_invalid_key_is_rejected_without_creating_a_session():
    main.ai_provider = FakeAI()

    response = client.post("/chat/sessions", headers=key_headers("invalid"))

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_API_KEY"
    assert "invalid" not in response.text


def test_anonymous_chat_is_isolated_and_not_persisted():
    fake_ai = FakeAI()
    main.ai_provider = fake_ai
    database_path = Path("backend/cat_therapist.db")
    database_before = database_path.stat() if database_path.exists() else None
    first = create_session()
    second = create_session()
    first_headers = session_headers(first["session_id"])
    second_headers = session_headers(second["session_id"])

    created = client.post("/conversations", headers=first_headers, json={"title": "Private check-in"})
    conversation_id = created.json()["id"]
    response = client.post(f"/conversations/{conversation_id}/messages", headers=first_headers, json={"content": "A private prompt"})

    assert response.status_code == 200
    assert client.post(f"/conversations/{conversation_id}/messages", headers=second_headers, json={"content": "Cross-session attempt"}).status_code == 404
    assert SECRET_KEY not in repr(main.chat_store._sessions)
    database_after = database_path.stat() if database_path.exists() else None
    assert database_after == database_before
    assert fake_ai.used_keys == [SECRET_KEY]


def test_missing_or_expired_session_is_rejected():
    main.ai_provider = FakeAI()

    response = client.post("/conversations", headers=session_headers("not-a-real-session"), json={})

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "SESSION_NOT_FOUND"


def test_session_deletion_removes_messages():
    main.ai_provider = FakeAI()
    session = create_session()
    headers = session_headers(session["session_id"])
    conversation = client.post("/conversations", headers=headers, json={}).json()

    assert client.delete(f"/chat/sessions/{session['session_id']}").status_code == 204
    assert client.post(f"/conversations/{conversation['id']}/messages", headers=headers, json={"content": "Expired attempt"}).status_code == 404


def test_expired_session_is_removed(monkeypatch):
    from dataclasses import replace

    import backend.app.chat_store as chat_store_module

    monkeypatch.setattr(chat_store_module, "settings", replace(chat_store_module.settings, anonymous_session_ttl_seconds=0))
    store = chat_store_module.ChatStore()
    session_id, _ = store.create_session()

    assert store.delete_session(session_id) is False


def test_session_capacity_is_bounded(monkeypatch):
    from dataclasses import replace

    import backend.app.chat_store as chat_store_module

    monkeypatch.setattr(chat_store_module, "settings", replace(chat_store_module.settings, max_active_sessions=1))
    store = chat_store_module.ChatStore()
    store.create_session()

    try:
        store.create_session()
    except RuntimeError:
        return
    raise AssertionError("session capacity was not enforced")


def test_session_creation_rate_is_bounded(monkeypatch):
    from dataclasses import replace

    import backend.app.chat_store as chat_store_module

    monkeypatch.setattr(chat_store_module, "settings", replace(chat_store_module.settings, max_session_creations_per_minute=1, max_active_sessions=2))
    store = chat_store_module.ChatStore()
    store.create_session()
    store.delete_session(next(iter(store._sessions)))

    try:
        store.create_session()
    except RuntimeError:
        return
    raise AssertionError("session creation rate was not enforced")


def test_blank_message_and_provider_failure_are_controlled():
    main.ai_provider = FakeAI()
    session = create_session()
    headers = session_headers(session["session_id"])
    conversation = client.post("/conversations", headers=headers, json={}).json()
    conversation_id = conversation["id"]

    assert client.post(f"/conversations/{conversation_id}/messages", headers=headers, json={"content": "   "}).status_code == 422

    class BrokenAI:
        def validate_key(self, api_key):
            return None

        def reply(self, api_key, history, content):
            raise main.AIUnavailable

    main.ai_provider = BrokenAI()
    response = client.post(f"/conversations/{conversation_id}/messages", headers=headers, json={"content": "Please respond"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AI_UNAVAILABLE"
