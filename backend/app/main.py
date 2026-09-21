import os
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .ai import AIProvider, AIUnavailable
from .chat_store import ChatStore, DuplicateEmailError
from .config import settings
from .database import initialize
from .models import (
    AuthResponse,
    ChatResponse,
    Conversation,
    ConversationCreate,
    ErrorResponse,
    Message,
    MessageCreate,
    ObservationIn,
    ObservationOut,
    PublicUser,
    RegisterRequest,
    SessionSummary,
)
from .reactions import reaction_for
from .models import LoginRequest
from .store import SessionStore

app = FastAPI(title="Cat Therapist API", version="1.0.0")
origins = list(settings.allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=settings.allow_credentials,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
store = SessionStore()
chat_store = ChatStore()
ai_provider: AIProvider = AIProvider()
bearer = HTTPBearer(auto_error=False)
initialize()


def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> PublicUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication is required."}, headers={"WWW-Authenticate": "Bearer"})
    user = chat_store.user_for_token(credentials.credentials)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "The access token is invalid or expired."}, headers={"WWW-Authenticate": "Bearer"})
    return user


UserDependency = Annotated[PublicUser, Depends(current_user)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> AuthResponse:
    try:
        user = chat_store.create_user(payload.email, payload.password)
    except DuplicateEmailError:
        raise HTTPException(status_code=409, detail={"code": "EMAIL_EXISTS", "message": "An account with that email already exists."}) from None
    return AuthResponse(user=user, access_token=chat_store.issue_token(user.id, settings.token_ttl_hours))


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    user = chat_store.authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect."})
    return AuthResponse(user=user, access_token=chat_store.issue_token(user.id, settings.token_ttl_hours))


@app.get("/auth/me", response_model=PublicUser)
def me(user: UserDependency) -> PublicUser:
    return user


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> Response:
    if credentials:
        chat_store.revoke_token(credentials.credentials)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, user: UserDependency) -> Conversation:
    return chat_store.create_conversation(user.id, payload.title)


@app.get("/conversations", response_model=list[Conversation])
def list_conversations(user: UserDependency) -> list[Conversation]:
    return chat_store.list_conversations(user.id)


@app.get("/conversations/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: UUID, user: UserDependency) -> Conversation:
    conversation = chat_store.get_conversation(user.id, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    return conversation


@app.get("/conversations/{conversation_id}/messages", response_model=list[Message])
def list_messages(conversation_id: UUID, user: UserDependency) -> list[Message]:
    messages = chat_store.list_messages(user.id, conversation_id)
    if messages is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    return messages


@app.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: UUID, user: UserDependency) -> Response:
    if not chat_store.delete_conversation(user.id, conversation_id):
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
def send_message(conversation_id: UUID, payload: MessageCreate, user: UserDependency) -> ChatResponse:
    if chat_store.get_conversation(user.id, conversation_id) is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    history = chat_store.list_messages(user.id, conversation_id) or []
    user_message = chat_store.add_message(user.id, conversation_id, "user", payload.content)
    if user_message is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    try:
        reply = ai_provider.reply(history, payload.content)
    except AIUnavailable:
        raise HTTPException(status_code=503, detail={"code": "AI_UNAVAILABLE", "message": "The cat is unavailable right now. Please try again shortly."}) from None
    assistant_message = chat_store.add_message(user.id, conversation_id, "assistant", reply)
    if assistant_message is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Conversation not found."})
    return ChatResponse(user_message=user_message, assistant_message=assistant_message)


@app.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session() -> dict[str, str]:
    """Start a consented, temporary expression-analysis session."""
    session = store.create()
    return {"session_id": session.id, "data_retention": "memory only; deleted on request or service restart"}


@app.post("/sessions/{session_id}/observations", response_model=ObservationOut)
def analyse_observation(session_id: str, observation: ObservationIn) -> ObservationOut:
    if not observation.face_detected:
        return ObservationOut(expression="neutral", confidence=0, stable_for_seconds=0, reaction="I can’t see a face right now. Check the camera angle or lighting.", should_speak=False)
    try:
        item, stable_for = store.add(session_id, observation.expression_scores)
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found") from None
    # Avoid repetitive reactions to noisy frame-by-frame classifications.
    should_speak = item.confidence >= 0.60 and stable_for >= 2
    return ObservationOut(expression=item.expression, confidence=item.confidence, stable_for_seconds=stable_for, reaction=reaction_for(item.expression), should_speak=should_speak)


@app.get("/sessions/{session_id}", response_model=SessionSummary)
def get_summary(session_id: str) -> SessionSummary:
    try:
        return store.summary(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found") from None


@app.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str) -> Response:
    if not store.delete(session_id):
        raise HTTPException(status_code=404, detail="session not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
