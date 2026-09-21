from datetime import datetime
from typing import Literal

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
