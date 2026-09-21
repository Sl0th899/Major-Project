import os

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .models import ObservationIn, ObservationOut, SessionSummary
from .reactions import reaction_for
from .store import SessionStore

app = FastAPI(title="Expression Reaction API", version="0.1.0")
origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=os.getenv("ALLOW_CREDENTIALS", "true").lower() == "true",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)
store = SessionStore()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
