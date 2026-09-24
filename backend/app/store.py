from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from .models import Expression, ExpressionScores, SessionSummary


@dataclass
class StoredObservation:
    expression: Expression
    confidence: float
    received_at: datetime


@dataclass
class ExpressionSession:
    id: str
    started_at: datetime
    updated_at: datetime
    observations: deque[StoredObservation] = field(default_factory=lambda: deque(maxlen=300))


class SessionStore:
    """Ephemeral in-memory store; restart the service to clear all session data."""

    def __init__(self) -> None:
        self._sessions: dict[str, ExpressionSession] = {}
        self._lock = Lock()

    def create(self) -> ExpressionSession:
        now = datetime.now(timezone.utc)
        session = ExpressionSession(id=str(uuid4()), started_at=now, updated_at=now)
        with self._lock:
            self._sessions[session.id] = session
        return session

    def add(self, session_id: str, scores: ExpressionScores) -> tuple[StoredObservation, float]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise KeyError(session_id)
            values = scores.model_dump()
            expression = max(values, key=values.get)  # type: ignore[assignment]
            confidence = values[expression]
            record = StoredObservation(expression=expression, confidence=confidence, received_at=datetime.now(timezone.utc))
            session.observations.append(record)
            session.updated_at = record.received_at
            consecutive = 0
            for previous in reversed(session.observations):
                if previous.expression != expression:
                    break
                consecutive += 1
            stable_for = (consecutive - 1) * 0.5  # client should submit roughly twice per second
            return record, stable_for

    def summary(self, session_id: str) -> SessionSummary:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise KeyError(session_id)
            counts = Counter(item.expression for item in session.observations)
            total = len(session.observations)
            distribution = {name: round(counts[name] / total, 3) if total else 0.0 for name in Expression.__args__}
            dominant = max(counts, key=counts.get) if counts else None
            return SessionSummary(session_id=session.id, observations=total, expression_distribution=distribution, dominant_expression=dominant, started_at=session.started_at, updated_at=session.updated_at)

    def delete(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None
