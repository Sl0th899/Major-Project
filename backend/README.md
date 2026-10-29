# Face emotion module

The standalone v1 module is `app/face_emotion.py`. It accepts an image path or
an OpenCV BGR frame, detects faces with Lindevs' YOLOv8-Face `n` weights, and
runs DeepFace emotion analysis on each detected face crop. The Lindevs model is
fine-tuned on WIDERFace. This module does not depend on or modify the
personality/text evaluation code, and it does not track identities between
frames.

Install the backend dependencies from this directory:

```powershell
python -m pip install -r requirements.txt
```

Example (run from `backend`):

```python
import json

from app.face_emotion import analyze_frame

result = analyze_frame("photo.jpg")
print(json.dumps(result, indent=2))
```

The Lindevs model weights are fetched from the project's latest release on the
first inference. You can also pass a local weight file with `model_path=...`.
For a webcam, pass the BGR frame returned by `cv2.VideoCapture.read()` to
`analyze_frame(frame)`.

The returned object has this shape:

```json
{
  "captured_at": "2026-10-29T08:40:00+00:00",
  "detections": [
    {
      "bbox": [20, 15, 180, 190],
      "confidence": 0.97,
      "dominant_emotion": "happy",
      "emotion_scores": {
        "angry": 0.01,
        "disgust": 0.0,
        "fear": 0.0,
        "happy": 98.2,
        "sad": 0.0,
        "surprise": 0.0,
        "neutral": 1.79
      }
    }
  ]
}
```

`bbox` uses clipped integer pixel coordinates `[x1, y1, x2, y2]` in the
original image; emotion scores retain DeepFace's 0 to 100 scale. `captured_at` is
an ISO-8601 UTC timestamp generated when analysis starts. A frame with no
detections returns an empty `detections` list.

Run the focused tests from the repository root with:

```powershell
python -m pytest backend/tests/test_face_emotion.py
```
