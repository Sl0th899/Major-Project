from backend.app.face_emotion import analyze_frame, detect_faces


class FakeTensor:
    def __init__(self, values):
        self.values = values

    def tolist(self):
        return self.values


class FakeFrame:
    shape = (100, 120, 3)

    def __getitem__(self, selection):
        self.crop_selection = selection
        return self


class FakeBoxes:
    def __init__(self, coordinates, confidences):
        self.xyxy = FakeTensor(coordinates)
        self.conf = FakeTensor(confidences)


class FakeResult:
    def __init__(self, original_image, boxes):
        self.orig_img = original_image
        self.boxes = boxes


class FakeDetector:
    def __init__(self, result):
        self.result = result
        self.predict_arguments = None

    def predict(self, **kwargs):
        self.predict_arguments = kwargs
        return [self.result]


def test_detect_faces_returns_clipped_pixel_boxes_and_confidence():
    frame = FakeFrame()
    detector = FakeDetector(
        FakeResult(frame, FakeBoxes([[-3, 5, 125, 101]], [0.91]))
    )

    original_image, detections = detect_faces(frame, detector=detector)

    assert original_image is frame
    assert detections == [
        {"bbox": [0, 5, 120, 100], "confidence": 0.91}
    ]
    assert detector.predict_arguments == {"source": frame, "verbose": False}


def test_detect_faces_returns_empty_list_when_no_face_is_found():
    frame = FakeFrame()
    detector = FakeDetector(FakeResult(frame, FakeBoxes([], [])))

    original_image, detections = detect_faces(frame, detector=detector)

    assert original_image is frame
    assert detections == []


def test_analyze_frame_adds_deepface_emotion_scores_to_each_detection():
    frame = FakeFrame()
    detector = FakeDetector(
        FakeResult(frame, FakeBoxes([[10, 20, 50, 70]], [0.91]))
    )
    emotion_calls = []

    def fake_emotion_analyzer(**kwargs):
        emotion_calls.append(kwargs)
        return [
            {
                "dominant_emotion": "happy",
                "emotion": {"happy": 87.5, "sad": 12.5},
            }
        ]

    result = analyze_frame(
        frame, detector=detector, emotion_analyzer=fake_emotion_analyzer
    )

    assert result["captured_at"].endswith("+00:00")
    assert result["detections"] == [
        {
            "bbox": [10, 20, 50, 70],
            "confidence": 0.91,
            "dominant_emotion": "happy",
            "emotion_scores": {"happy": 87.5, "sad": 12.5},
        }
    ]
    assert emotion_calls[0]["img_path"] is frame
    assert emotion_calls[0]["actions"] == ["emotion"]
    assert emotion_calls[0]["enforce_detection"] is False
    assert emotion_calls[0]["detector_backend"] == "skip"
    assert frame.crop_selection == (slice(20, 70), slice(10, 50))


def test_analyze_frame_skips_deepface_when_no_face_is_detected():
    frame = FakeFrame()
    detector = FakeDetector(FakeResult(frame, FakeBoxes([], [])))

    def unexpected_emotion_call(**kwargs):
        raise AssertionError("DeepFace should not run without a detected face.")

    result = analyze_frame(
        frame, detector=detector, emotion_analyzer=unexpected_emotion_call
    )

    assert result["captured_at"].endswith("+00:00")
    assert result["detections"] == []
