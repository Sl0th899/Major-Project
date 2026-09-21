# Cat Therapist Backend

FastAPI backend for a conversational virtual cat companion. It uses SQLite for users, conversations, and messages. Passwords are hashed with PBKDF2, bearer tokens expire, and every conversation query is scoped to the authenticated user.

The AI integration uses an OpenAI-compatible `/chat/completions` endpoint. The backend does not generate fallback or fake assistant messages: without `AI_API_KEY`, chat returns `503 AI_UNAVAILABLE`.

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --env-file .env
```

Set the values in `.env` in the shell or load it before starting Uvicorn. Interactive API docs are available at `http://127.0.0.1:8000/docs`.

For tests from the repository root:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
backend\.venv\Scripts\python.exe -m pytest -q
```

## Frontend API contract

Protected endpoints use `Authorization: Bearer <access_token>`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Liveness check |
| POST | `/auth/register` | No | `{email, password}` -> user and token |
| POST | `/auth/login` | No | `{email, password}` -> user and token |
| GET | `/auth/me` | Yes | Return the current user |
| POST | `/auth/logout` | Yes | Revoke the current token |
| POST | `/conversations` | Yes | `{title?}` -> new conversation |
| GET | `/conversations` | Yes | List the user's conversations |
| GET | `/conversations/{id}` | Yes | Retrieve an owned conversation |
| DELETE | `/conversations/{id}` | Yes | Delete a conversation and its messages |
| GET | `/conversations/{id}/messages` | Yes | Retrieve stored messages |
| POST | `/conversations/{id}/messages` | Yes | `{content}` -> user and assistant messages |

Message content is trimmed and limited to 4,000 characters. Invalid input returns `422`; missing or invalid authentication returns `401`; another user's conversation appears as `404`; provider failures return `503`.

## AI and wellness boundaries

The system prompt keeps Cat Therapist warm and supportive while explicitly avoiding claims of professional licensure, diagnosis, medication advice, or emergency intervention. User messages are treated as untrusted content and only the most recent 20 stored messages are sent as context. Routine application code does not log passwords, tokens, API keys, or message content.

## Existing expression API

The original privacy-first browser expression flow remains available at `POST /sessions`, `POST /sessions/{id}/observations`, `GET /sessions/{id}`, and `DELETE /sessions/{id}`. It accepts expression scores only; it never accepts or stores images or video frames. These sessions remain in memory and are independent of chat conversations.
