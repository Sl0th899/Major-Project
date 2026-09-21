# Expression Reaction Backend

A privacy-first FastAPI backend for a consented webcam experience. The camera and face model run in the browser; the browser sends only expression confidence values, never images or video frames. This API smooths observations into a session summary and returns a grounded reaction.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API docs are at `http://127.0.0.1:8000/docs`.

## Frontend flow

1. Clearly ask for camera permission and explain the purpose before calling `getUserMedia`.
2. Run a face-expression model locally (for example MediaPipe or TensorFlow.js).
3. On explicit user opt-in, `POST /sessions`.
4. Submit derived scores about twice per second to `POST /sessions/{id}/observations`.
5. Show or speak `reaction` only when `should_speak` is true.
6. Delete the session when the camera stops: `DELETE /sessions/{id}`.

Example observation:

```json
{
  "face_detected": true,
  "expression_scores": {"neutral": 0.08, "happy": 0.82, "sad": 0.01, "angry": 0.01, "surprised": 0.03, "fearful": 0.01, "disgusted": 0.01, "confused": 0.03}
}
```

## Important limits

Expression estimates are uncertain and are not a diagnosis or a reliable measure of feelings, intent, identity, or mental state. Do not use the output for high-stakes decisions. This starter implementation is ephemeral: it does not persist images, recordings, identifiers, or session data to disk.
