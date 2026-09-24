from backend.app.models import ExpressionScores
from backend.app.store import SessionStore


def test_session_summary_and_stability() -> None:
    store = SessionStore()
    session = store.create()
    scores = ExpressionScores(neutral=0.1, happy=0.9)

    first, first_stability = store.add(session.id, scores)
    second, second_stability = store.add(session.id, scores)
    summary = store.summary(session.id)

    assert first.expression == "happy"
    assert second.expression == "happy"
    assert first_stability == 0
    assert second_stability == 0.5
    assert summary.observations == 2
    assert summary.dominant_expression == "happy"


def test_stability_resets_when_expression_changes() -> None:
    store = SessionStore()
    session = store.create()
    store.add(session.id, ExpressionScores(happy=0.9))
    _, stability = store.add(session.id, ExpressionScores(sad=0.9))

    assert stability == 0
