# Miso: Cat Therapist frontend

React + TypeScript frontend for the [Cat Therapist backend](https://github.com/Sl0th899/Major-Project).
Miso is a hand-drawn marmalade cat who listens. Users create an account, talk to Miso, and come back to saved conversations.

## Run it

You need Node 18+ and the backend running.

```bash
# 1. Backend (from the Major-Project repo)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                                # then set AI_API_KEY
uvicorn app.main:app --reload --env-file .env       # http://localhost:8000

# 2. Frontend (this folder)
npm install
cp .env.example .env
npm run dev                                          # http://localhost:5173
```

Open **http://localhost:5173** (not 127.0.0.1: the backend's CORS list only allows `localhost`).

Other scripts: `npm run build` (typecheck + production build), `npm run preview`, `npm test` (unit tests).

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | frontend `.env` | Backend origin, e.g. `http://localhost:8000`. No trailing slash. |
| `AI_API_KEY` | backend `.env` | **Required for chat.** Without it every message returns 503 and Miso shows "couldn't reply". |
| `ALLOWED_ORIGINS` | backend `.env` | Must include the frontend origin (default already has `http://localhost:5173`). |

## Structure

```
src/
  api/          fetch client, typed endpoints, runtime response guards, ApiError
  state/        AuthContext, ConversationsContext, ToastContext
  hooks/        useChat (send/load/reconcile), useOnlineStatus, useDocumentTitle
  components/
    miso/       Miso.tsx: the SVG cat, 11 moods, idle animation, head-only avatar
    ui/         Button, TextField, Dialog, StatePanel, Logo, Icon, FullPageLoader
    chat/       MessageList, RichText, Composer, ConversationList, ChatHeader
  layouts/      ChatLayout (sidebar / mobile drawer + delete dialog)
  pages/        Landing, AuthPage, ChatHome, ConversationPage, NotFound
  routes/       RequireAuth, PublicOnly
  styles/       tokens.css (design tokens) + per-area stylesheets
  utils/        date formatting, reply formatter, token storage
tests/e2e/      Playwright end-to-end test + a TEST-ONLY fake AI provider
```

## How it maps to the backend

Every screen uses real endpoints; there is no mock data in the app.

- **Auth:** `/auth/register`, `/auth/login`, `/auth/me` (session restore), `/auth/logout`. The bearer token is the only thing stored: `sessionStorage` by default, `localStorage` if "Keep me signed in" is ticked. Any 401 clears it and sends the user to sign in.
- **Conversations:** list, create, delete. The backend never names conversations, so the frontend creates each one with a title taken from the first message.
- **Chat:** `POST /conversations/{id}/messages`. The backend saves the user's message *before* calling the AI, so after any failure the frontend re-reads the thread instead of guessing. If the message was saved without a reply, Miso says so and offers "Try again". If it never reached the server, the text goes back into the composer.
- **Replies** are rendered by a small formatter (paragraphs, lists, bold) into React elements. Nothing is injected as HTML.

## Testing

- `npm test` runs the unit tests: error parsing, response guards, reply formatting, titles, date grouping.
- `tests/e2e/e2e.py` runs 21 browser checks against the real backend. It needs Python Playwright.
  - It uses `stub_ai.py`, a fake OpenAI-compatible server for tests only, so chat can be tested without an API key.
  - It covers register/login/logout, sending and receiving, AI failure and retry, delete, 404s, invalid tokens, mobile layout and backend-down states.
