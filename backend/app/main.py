from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .ai import AIKeyInvalid, AIProvider, AIUnavailable
from .chat_store import ChatStore, SessionNotFound
from .config import settings
from .models import (
    AnonymousSession,
    ChatResponse,
    Conversation,
    ConversationCreate,
    MessageCreate,
)

app = FastAPI(
    title="Cat Therapist API",
    version="1.0.0",
    docs_url="/docs" if settings.enable_api_docs else None,
    redoc_url="/redoc" if settings.enable_api_docs else None,
    openapi_url="/openapi.json" if settings.enable_api_docs else None,
)
origins = list(settings.allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=settings.allow_credentials,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Provider-API-Key", "X-Anonymous-Session"],
)
chat_store = ChatStore()
ai_provider: AIProvider = AIProvider()


def provider_key_header(value: Annotated[str | None, Header(alias="X-Provider-API-Key")] = None) -> str:
    if not value or len(value) > 4096:
        raise HTTPException(status_code=401, detail={"code": "API_KEY_REQUIRED", "message": "A provider API key is required."})
    return value


def session_header(value: Annotated[str | None, Header(alias="X-Anonymous-Session")] = None) -> str:
    if not value or len(value) > 256:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Anonymous session not found."})
    return value


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat/sessions", response_model=AnonymousSession, status_code=status.HTTP_201_CREATED)
def create_chat_session(api_key: Annotated[str, Depends(provider_key_header)]) -> AnonymousSession:
    try:
        ai_provider.validate_key(api_key)
        session_id, expires_at = chat_store.create_session()
    except AIKeyInvalid:
        raise HTTPException(status_code=401, detail={"code": "INVALID_API_KEY", "message": "The provider API key could not be used."}) from None
    except AIUnavailable:
        raise HTTPException(status_code=503, detail={"code": "AI_UNAVAILABLE", "message": "The AI provider is unavailable right now."}) from None
    except RuntimeError:
        raise HTTPException(status_code=503, detail={"code": "SESSION_CAPACITY", "message": "Anonymous sessions are temporarily full."}) from None
    return AnonymousSession(session_id=session_id, expires_at=expires_at)


@app.delete("/chat/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(session_id: str) -> Response:
    chat_store.delete_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, session_id: Annotated[str, Depends(session_header)]) -> Conversation:
    try:
        return chat_store.create_conversation(session_id, payload.title)
    except SessionNotFound:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Anonymous session not found."}) from None


@app.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
def send_message(
    conversation_id: UUID,
    payload: MessageCreate,
    session_id: Annotated[str, Depends(session_header)],
    api_key: Annotated[str, Depends(provider_key_header)],
) -> ChatResponse:
    try:
        if chat_store.get_conversation(session_id, conversation_id) is None:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
        history = chat_store.list_messages(session_id, conversation_id) or []
        reply = ai_provider.reply(api_key, history, payload.content)
        user_message = chat_store.add_message(session_id, conversation_id, "user", payload.content)
        assistant_message = chat_store.add_message(session_id, conversation_id, "assistant", reply)
    except SessionNotFound:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Anonymous session not found."}) from None
    except ValueError:
        raise HTTPException(status_code=413, detail={"code": "SESSION_LIMIT", "message": "This anonymous session has reached its message limit."}) from None
    except AIKeyInvalid:
        raise HTTPException(status_code=401, detail={"code": "INVALID_API_KEY", "message": "The provider API key could not be used."}) from None
    except AIUnavailable:
        raise HTTPException(status_code=503, detail={"code": "AI_UNAVAILABLE", "message": "The AI provider is unavailable right now."}) from None
    if user_message is None or assistant_message is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    return ChatResponse(user_message=user_message, assistant_message=assistant_message)
