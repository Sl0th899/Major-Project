# AI-Powered Judging Cat — Theory & Backend Design

**Document status:** Theory only (v0.1) · No code yet
**Scope:** Backend only. The 8-bit frontend (cat sprites, animations, UI) is a separate future phase.

---

## 1. Concept

A webcam-driven "AI cat" that watches a person and delivers verdicts about them.
The verdicts are a mix of:

- **Observed truth** (derived from Computer Vision signals)
- **Comedic wrapping** (presented by an LLM with a loud 8-bit cat persona)

The backend is the brain: it captures video, extracts structured observations
about the person, and turns those observations into short verdicts the cat can
meow out. The backend does **not** render anything — it only produces data.
The frontend will decide how to display it.

### Core design principle

> The backend measures. The cat talks.

No verdict is written from nothing. Every judgement must trace back to a
measurable, CV-derived fact about the person in frame. The LLM is a
presentational layer, not a source of truth.

---

## 2. The Four Judging Modules

The cat judges on four axes. Each axis is a **module** that produces a
continuous numeric signal, and all signals combine into a single **person
profile** for each session.

### Module A — Attention & Focus
*Question the cat answers: "Is this person actually working?"*

| Signal | Meaning | CV Source |
|---|---|---|
| Gaze-on-screen ratio | % of time looking at the screen | Face landmarks (eyes) → gaze vectors |
| Blink rate | Normal ~15-20/min; deviation signals staring or spacing out | Blink detection |
| Head-pose stability | How much the head drifts/turns | Head pose estimation (yaw/pitch/roll) |
| Presence continuity | Does the person vanish from frame repeatedly? | Face tracker hits/frames |

### Module B — Mood & Emotion
*Question: "How is this person doing, really?"*

| Signal | Meaning | CV Source |
|---|---|---|
| Primary emotion | happy / sad / angry / surprised / neutral / disgusted / fear | Classification over the face crop |
| Emotion stability | Mood swings vs monotone | Running variance of emotion logits |
| Stress proxy | Frown intensity, brow tension, jaw clench | Facial action units (AUs) |
| Tiredness proxy | Eye openness, yawn-like mouth geometry, blink timing | Landmark geometry ratios |

### Module C — Posture & Body Language
*Question: "How are they sitting?"*

| Signal | Meaning | CV Source |
|---|---|---|
| Slouch angle | Shoulder-drop relative to ear/hip axis | Upper-body pose keypoints |
| Fidget rate | Sudden position/orientation shifts | Keypoint displacement deltas |
| Distance from camera | Leaning in vs leaning back | Inter-ocular distance (face size) |
| Asymmetry | Lopsided sitting, head tilt | Keypoint symmetry metrics |

### Module D — Appearance Roast
*Question: "What can we politely mock?"*

This is the comedic module. It is **heuristic**, not trainable — it derives
over-the-top but technically-factual observations from the other modules and
trait estimates:

| Trait estimate | CV Source |
|---|---|
| Hair visibility/occlusion (hat/hood) | Head segmentation/bbox top region |
| Glasses presence | Face landmark region around eyes |
| Face "tiredness" | Combined Module B signals |
| Beard/stubble coarseness estimate | Texture/shadow analysis in lower face region |
| General grooming proxy | Hair-region entropy + tiredness |

All Module D outputs are clearly marked as *estimates* downstream, so the
cat can roast without the backend ever "claiming" a false fact.

---

## 3. Recommended Backend Stack

### Recommendation: Python pipeline — OpenCV + MediaPipe → rule-based aggregator → LLM verdict writer

Three layers, each replaceable:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Capture & Perception (Python, local)          │
│  OpenCV          — frame capture from webcam            │
│  MediaPipe       — face mesh, landmarks, gaze,          │
│                    pose keypoints, blink detection      │
│  Emotion classifier — small ONNX/TFLite model           │
│                    (e.g. fer-style classifiers)         │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: Signal Aggregation (pure Python, local)       │
│  Converts raw per-frame CV outputs → rolling windows,   │
│  counters, ratios. Emits a PersonProfile. Deterministic,│
│  unit-testable.                                         │
├─────────────────────────────────────────────────────────┤
│  LAYER 3: Verdict Engine (Python, optional remote LLM)  │
│  Takes the PersonProfile + persona system prompt →      │
│  short verdict lines (≤ ~2 sentences each).             │
│  Supports offline fallback: a template library so the   │
│  cat still talks with no network.                       │
└─────────────────────────────────────────────────────────┘
```

### Why this stack

- **Python + OpenCV + MediaPipe** — fastest route to real-time landmarks, gaze,
  and pose; runs on CPU without GPU; huge support base.
- **Rule-based aggregation (Layer 2)** — the judging logic stays deterministic,
  testable, and explainable. University projects often need to **show the math**;
  a black-box "AI judged you" is weak. Explicit signals = strong project defense.
- **LLM only at the end** — verdict text is generated from structured facts.
  This keeps API costs tiny (short prompts), keeps offline fallback viable, and
  lets the frontend show *"gaze: 22% | mood: sad → verdict: ..."*.

### Alternatives, for the record

| Stack | Trade-off |
|---|---|
| YOLO/Deep-learning detection stack | Heavier, needs a GPU for real-time; overkill since we detect one human face, not arbitrary objects |
| Pure rule-based, no LLM | Fully offline, zero cost, but verdicts get repetitive — the cat sounds like a toaster |
| Full-LLM "vision" (multimodal, images straight to LLM) | Most flexible wording, but slow, costly per frame, and un-verifiable — it *hallucinates* judgements. Rejected for the judging core. |

---

## 4. Data Flow (Per Session)

```
webcam frames (30 fps)
      │
      ▼
[Layer 1] Per-frame extraction (~every N-th frame; N≈5 default)
      │   face present? landmarks? gaze? pose? emotion?
      │   → produces one FrameObservation per sampled frame
      ▼
[Layer 2] Sliding-window aggregation
      │   last T seconds of observations
      │   → computes module signals (ratios, counts, running stats)
      │   → builds PersonProfile (session-so-far)
      ▼
[Layer 3] Verdict triggers (event loop, not every frame!)
      │   • New "judgement episode" starts
      │   • Threshold crossed (e.g. gaze < 10% for 60s)
      │   • Person re-enters frame (cat "notices" you)
      │   • Explicit frontend request ("judge me now")
      │
      ▼
VerdictEvent JSON  ──►  subscribed clients (websocket/pipe to UI)
```

### Key design decisions

- **Sampling, not continuous processing.** Judging at 30 fps wastes compute and
  makes the cat spaz. Sample at ~6 Hz, aggregate over rolling windows of 10–60 s.
- **State machine over always-on.** The cat has states: *watching* →
  *deciding* → *delivering verdict* → *back to watching*. Never streams verdicts.
- **Event-driven output.** The backend exposes verdicts as events. The 8-bit UI
  subscribes; the backend never touches rendering.

---

## 5. The PersonProfile (Core Data Model)

The single object everything downstream consumes:

```json
{
  "session": { "id": "...", "started_at": "...", "frames_seen": 1240, "frames_with_face": 1100 },
  "attention":  { "gaze_ratio": 0.71, "blink_rate_per_min": 14, "head_pose_stability": 0.82, "presence": 0.89 },
  "mood":       { "dominant": "neutral", "confidence": 0.6, "mood_swing_index": 0.3, "stress_proxy": 0.4, "tiredness": 0.2 },
  "posture":    { "slouch_angle_deg": 24.1, "fidget_rate": 3.2, "distance_probable_cm": 65, "asymmetry": 0.08 },
  "appearance": { "glasses": {"present": true, "confidence": 0.7}, "headwear": false, "grooming_proxy": 0.55, "face_region_tiredness": 0.2 },
  "timeline":   [ { "t": 0, "emotion": "happy", "gaze": 0.8 }, { "t": 30, "emotion": "neutral", "gaze": 0.5 } ],
  "flagged_events": [ { "t": 122, "type": "gaze_drop", "detail": "no screen contact for 45s" } ]
}
```

Every field is a **number or a counted ratio** first — text only exists at the
verdict layer. This keeps Layer 2 pure and testable.

---

## 6. Verdict Engine Theory

Two components:

### 6.1 Templates (offline, always available)

A library of verdict templates parameterized by profile values:

- `"You've checked the screen {gaze_ratio}% of the time. The cat is not impressed."`
- `"Mood: {dominant}. Confidence: {confidence}. The cat sees everything."`
- `"Slouch angle: {slouch_angle_deg} degrees. The cat has seen better posture in a JPEG of a cheetah."`

Templates guarantee the cat works with zero network. They also act as
**ground truth for grading**: when an examiner asks "how is the judging
validated?", the answer is "here is the exact rule that maps signal X to
statement Y".

### 6.2 LLM persona writer (when available)

When a richer verdict is wanted, the profile + a **static persona prompt** are
sent to an LLM. The persona prompt is the cat's entire personality — it never
sees raw video, only numbers. Prompt contract:

```
You are an 8-bit pixel cat judge. Critique this person using ONLY the
following measured facts. Never invent facts. Keep verdicts to two
sentences. Tone: sarcastic but soft, retro arcade energy.
Facts: <PersonProfile JSON>
```

### 6.3 Honesty rules (non-negotiable)

1. **No invented facts.** The persona prompt forbids statements that do not
   reference a profile field.
2. **Verdict = fact + flavor.** The fact is Layer 2 data; the flavor is the cat.
3. **Signed estimates.** Appearance module values carry confidence; low-confidence
   values degrade to playful hedging ("possibly", "maybe", "allegedly").
4. **No body-shaming of identity.** Roasts target behavior and presentation,
   never weight, skin, age, or other protected attributes. The Module D heuristic
   list is curated for this on purpose.

---

## 7. Real-Time Constraints & Failure Modes

| Situation | Backend behavior |
|---|---|
| No face in frame | Cat enters "waiting" state; presence counter drops; eventually emits a "hello??" event — presence recovery triggers a re-entry verdict |
| Occluded face (hand over face) | Signals marked `low_confidence`, excluded from aggregation windows |
| Multiple faces | Take the **largest/closest** face (the "judgee"); others ignored this session |
| Dark room, grainy feed | Confidence thresholds gate every signal; low-confidence sessions make the cat complain about *visibility*, not about the person |
| Person walks away | Session ends, profile archived, new session starts on return |
| LLM offline | Automatic switch to template engine (6.1) |
| Webcam busy/locked | Backend reports `device_error` event; the cat pretends to nap until the camera frees up |

Behavioural handle: the cat's *sass level* should scale with confidence.
Low confidence → cat is confused, not mean.

---

## 8. Interface Contract with the Future 8-bit Frontend (no rendering here)

The backend commits to emitting these events; the UI designs animation states
around them later:

| Event | Payload (summary) | Frontend hook idea |
|---|---|---|
| `session_started` | session id, timestamp | Cat wakes up / opens eyes |
| `person_seen` | confidence, bbox rough position | Cat head tracks the person |
| `signal_update` | latest module numbers (throttled, ~1 Hz) | HUD meters, eyebrow raises |
| `verdict` | text + cited facts + severity | Speech bubble, "!" pop-in, screen shake for spicy ones |
| `cat_state` | watching / deciding / delivering / napping | Animation state machine driver |
| `device_error` | reason | Cat naps / static overlay |

---

## 9. Privacy & Ethics Note

- All CV runs **locally**. Video frames are processed in-process and never leave
  the machine. Only the PersonProfile numbers may optionally leave (for LLM
  verdicts), never raw video or identifiable imagery.
- The judgement is a parody of surveillance, not surveillance: no identity is
  stored, no face is saved, profiles are session-scoped and deletable.
- A single "cat is watching" indicator in the UI keeps the joke transparent.

---

## 10. Roadmap (Theory → Code)

| Phase | Deliverable | Dependencies |
|---|---|---|
| 0. Feasibility spike | Webcam → OpenCV → face detection + landmarks running at 6 Hz on target machine | Hardware + Python env |
| 1. Layer 1 modules | Per-frame observation extractor (gaze, blink, pose, emotion) | Phase 0 |
| 2. Layer 2 aggregator | Sliding-window signals + PersonProfile builder (pure unit tests) | Phase 1 |
| 3. Layer 3 templates | Template verdict engine + sass/confidence scaling | Phase 2 |
| 4. LLM writer | Persona prompt + offline fallback switch | Phase 3 |
| 5. Event stream | Session/verdict events over a simple socket/pipe | Phase 4 |
| 6. Simulator mode | Feed recorded video or synthetic profiles so the UI team can develop without a webcam | Phase 5 |
| 7. Frontend integration | 8-bit UI consumes event stream (separate project phase) | Phase 5 + UI |

### Open questions (to decide with the UI team before coding)

- Verdict cadence: how often should the cat talk? (default: event-driven only, plus manual "judge me" poke)
- Length of judging session before the cat "forgets" you (default: session = person in frame)
- Should the cat keep a grudge across sessions? (default: no — session-scoped)