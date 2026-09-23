# Cat Therapist Backend

FastAPI backend for a conversational virtual cat companion. Chat access is anonymous and uses a user-supplied OpenAI-compatible provider key for each request. The backend keeps only short-lived conversations in process memory; it does not persist accounts, provider keys, conversations, or messages.

The backend is a transient request processor. A provider key may exist in backend memory only while a provider request is being made. It is never stored, logged, cached, returned, or used as an identity. The application does not persist API keys or conversations, but hosting infrastructure, reverse proxies, network infrastructure, and the AI provider may retain metadata or request data under their own policies.

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --env-file .env
```

Set the values in `.env` in the shell or load it before starting Uvicorn. API documentation endpoints are disabled by default; set `ENABLE_API_DOCS=true` for local development. Use HTTPS when sending real provider keys.

For tests from the repository root:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
backend\.venv\Scripts\python.exe -m pytest -q
```

## Anonymous API contract

`POST /chat/sessions` validates `X-Provider-API-Key` and creates a random, short-lived anonymous session. The key is not returned or stored. Chat requests send both `X-Anonymous-Session` and `X-Provider-API-Key` headers. Neither header belongs in a URL.

| Method | Route | Headers | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Liveness check |
| POST | `/chat/sessions` | `X-Provider-API-Key` | Validate key and create an anonymous session |
| DELETE | `/chat/sessions/{id}` | No | Delete the anonymous session and its memory |
| POST | `/conversations` | `X-Anonymous-Session` | `{title?}` -> new in-memory conversation |
| POST | `/conversations/{id}/messages` | Both anonymous headers | `{content}` -> user and assistant messages |

Message content is trimmed and limited to 4,000 characters. Invalid input returns `422`; invalid provider keys return `401`; missing or expired sessions and cross-session conversations return `404`; provider failures return `503`. Sessions expire after `ANONYMOUS_SESSION_TTL_SECONDS` and are bounded by `MAX_ACTIVE_SESSIONS`, `MAX_SESSION_CREATIONS_PER_MINUTE`, and `MAX_MESSAGES_PER_SESSION`.

## AI and wellness boundaries

The system prompt keeps Cat Therapist warm and supportive while explicitly avoiding claims of professional licensure, diagnosis, medication advice, or emergency intervention. User messages are treated as untrusted content and only the most recent configured messages are sent as context. No application telemetry or analytics is added, and request bodies and sensitive headers must not be logged.

Only the routes listed above are part of the default application API. FastAPI documentation routes are intentionally disabled unless `ENABLE_API_DOCS=true` is explicitly set for development.
