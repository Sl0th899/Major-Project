from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


Expression = Literal[
    "neutral", "happy", "sad", "angry", "surprised", "fearful", "disgusted", "confused"
]


class ExpressionScores(BaseModel):
    """Confidence values emitted by the client's on-device face model."""

    model_config = ConfigDict(extra="forbid")

    neutral: float = 0.0
    happy: float = 0.0
    sad: float = 0.0
    angry: float = 0.0
    surprised: float = 0.0
    fearful: float = 0.0
    disgusted: float = 0.0
    confused: float = 0.0

    @field_validator("*")
    @classmethod
    def score_must_be_a_probability(cls, value: float) -> float:
        if not 0 <= value <= 1:
            raise ValueError("each expression score must be between 0 and 1")
        return value


class ObservationIn(BaseModel):
    """A single client-side observation. Never include a frame, image, or biometric identifier."""

    model_config = ConfigDict(extra="forbid")

    expression_scores: ExpressionScores
    face_detected: bool = True
    captured_at: datetime | None = None


class ObservationOut(BaseModel):
    expression: Expression
    confidence: float = Field(ge=0, le=1)
    stable_for_seconds: float = Field(ge=0)
    reaction: str
    should_speak: bool
    privacy_note: str = "No video frames are stored or accepted by this API."


class SessionSummary(BaseModel):
    session_id: str
    observations: int
    expression_distribution: dict[Expression, float]
    dominant_expression: Expression | None
    started_at: datetime
    updated_at: datetime


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("enter a valid email address")
        return value


class LoginRequest(RegisterRequest):
    pass


class PublicUser(BaseModel):
    id: UUID
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: PublicUser
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class ConversationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=120)


class Conversation(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message cannot be blank")
        return value


class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class ChatResponse(BaseModel):
    user_message: Message
    assistant_message: Message
