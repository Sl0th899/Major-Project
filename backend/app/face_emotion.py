from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict


DEFAULT_FACE_MODEL = (
    "https://github.com/lindevs/yolov8-face/releases/latest/download/"
    "yolov8n-face-lindevs.pt"
)


class FaceBox(TypedDict):
    bbox: list[int]
    confidence: float


class FaceDetection(FaceBox):
    dominant_emotion: str
    emotion_scores: dict[str, float]


class FrameEmotionResult(TypedDict):
    captured_at: str
    detections: list[FaceDetection]


def _load_detector(model_path: str | Path) -> Any:
    from ultralytics import YOLO

    return YOLO(str(model_path))


def detect_faces(
    image: Any,
    *,
    detector: Any | None = None,
    model_path: str | Path = DEFAULT_FACE_MODEL,
) -> tuple[Any, list[FaceBox]]:
    """Detect faces in one image path or OpenCV BGR frame."""
    if detector is None:
        detector = _load_detector(model_path)
    results = detector.predict(source=image, verbose=False)
    if len(results) != 1:
        raise ValueError("Expected exactly one image or webcam frame.")

    result = results[0]
    original_image = result.orig_img
    image_height, image_width = original_image.shape[:2]
    detections: list[FaceBox] = []

    if result.boxes is None:
        return original_image, detections

    boxes = result.boxes
    for coordinates, confidence in zip(
        boxes.xyxy.tolist(), boxes.conf.tolist(), strict=True
    ):
        x1, y1, x2, y2 = coordinates
        bbox = [
            max(0, min(image_width, int(x1))),
            max(0, min(image_height, int(y1))),
            max(0, min(image_width, int(x2))),
            max(0, min(image_height, int(y2))),
        ]
        if bbox[2] <= bbox[0] or bbox[3] <= bbox[1]:
            continue

        detections.append({"bbox": bbox, "confidence": float(confidence)})

    return original_image, detections


def _load_emotion_analyzer() -> Any:
    from deepface import DeepFace

    return DeepFace.analyze


def analyze_frame(
    image: Any,
    *,
    detector: Any | None = None,
    emotion_analyzer: Any | None = None,
    model_path: str | Path = DEFAULT_FACE_MODEL,
) -> FrameEmotionResult:
    """Detect faces and return DeepFace emotion scores for one image or BGR frame."""
    captured_at = datetime.now(timezone.utc).isoformat()
    original_image, detections = detect_faces(
        image, detector=detector, model_path=model_path
    )
    if not detections:
        return {"captured_at": captured_at, "detections": []}

    if emotion_analyzer is None:
        emotion_analyzer = _load_emotion_analyzer()

    emotion_detections: list[FaceDetection] = []
    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        face_crop = original_image[y1:y2, x1:x2]
        results = emotion_analyzer(
            img_path=face_crop,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="skip",
        )
        if isinstance(results, list):
            if not results:
                raise RuntimeError("DeepFace returned no emotion result for a face.")
            emotion_result = results[0]
        else:
            emotion_result = results

        if not isinstance(emotion_result, dict):
            raise RuntimeError("DeepFace returned an invalid emotion result.")
        if "dominant_emotion" not in emotion_result or "emotion" not in emotion_result:
            raise RuntimeError("DeepFace returned an incomplete emotion result.")
        emotion_scores = emotion_result["emotion"]
        if not isinstance(emotion_scores, dict):
            raise RuntimeError("DeepFace returned invalid emotion scores.")

        emotion_detection: FaceDetection = {
            **detection,
            "dominant_emotion": str(emotion_result["dominant_emotion"]),
            "emotion_scores": {
                str(emotion): float(score)
                for emotion, score in emotion_scores.items()
            },
        }
        emotion_detections.append(emotion_detection)

    return {"captured_at": captured_at, "detections": emotion_detections}
