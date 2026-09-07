# Judgement Improvement — Stages 0–2

Status: Stages 0–2 complete. The RED contracts were made GREEN in Stages 3–5.

This document records the decision and audit evidence that precedes gameplay
changes. It is not authority over `PRD.md`, `TRD.md`, or `rules-baseline.md`.

## Stage 0 — Contract decision

### Target

The MVP keeps `RULESET_VERSION = 2` while defects are reproduced. Its target is
the repository's documented osu!stable-style Standard/ScoreV1 contract:

- OD windows: 300=`80-6*OD`, 100=`140-8*OD`, 50=`200-10*OD`, inclusive.
- One physical press may start at most one earliest eligible Circle or Slider
  head; an earlier eligible object notelocks later objects even when the cursor
  is outside the earlier object's radius.
- A Slider head may start anywhere in its 50 window. Head, tick, repeat, and tail
  are acquired once each. The whole Slider result uses the documented acquired
  part ratio and contributes one final accuracy judgement.
- Slider legacy tail time is adapter-provided and currently occurs
  `min(36ms, spanDuration/2)` before visual end.
- Spinner consumes timestamped pointer movement while any input channel is held;
  RAF is a render signal, not an input sampling clock.
- AudioClock map time, including the documented positive offset, is authoritative
  for input, update, render, and storyboard time.

No rule value is changed in Stages 0–2, so `RULESET_VERSION` remains `2`. Stage 3
must reassess the version before GREEN if a required fix changes a previously
stored comparable outcome rather than restoring the already documented contract.

### Stable/lazer boundary

The official `ppy/osu` source and tests are comparison evidence. Current lazer
Slider head and tail scoring differs from stable/Classic behaviour, so current
lazer mechanics are not copied wholesale. The project continues using
`osu-standard-stable` at the adapter boundary and plain application DTOs at
runtime.

## Stage 1 — Current pipeline audit

The path and findings below are the pre-implementation Stage 1 snapshot. They
remain as root-cause evidence; the corresponding resolutions are recorded under
Stages 3–5 completion.

### Observed path

```text
DOM event.timeStamp
  -> InputManager.eventTimestampToMapTime()
  -> InputState transition queue
  -> CircleSliceApp frame advance
  -> ObjectScheduler.press() for queued presses
  -> ObjectScheduler.advance(previousMapTime, currentMapTime, finalHold, finalCursor)
  -> GameplayState.apply()
  -> renderer/HUD
```

`FrameCoordinator` reads AudioClock map time once and passes the same current
value to update and render. `AudioClock` applies positive offset to both frame
time and event timestamp conversion. These parts match the contract.

### Findings

| ID | Evidence in current source | Contract impact | Stage 2 proof |
|---|---|---|---|
| J-01 | `ObjectScheduler.press()` delegates only to `CircleScheduler`, whose constructor removes every non-Circle. | Slider heads cannot be started by a press within their 50 window. They are instead sampled only when their scheduled nested-part time crosses a frame. | `slider-head-late-window.json` |
| J-02 | The notelock candidate list exists only inside `CircleScheduler`. | An earlier Slider head cannot lock a later Circle, contrary to TRD 13.4. | `notelock-overlap-slider-head.json` |
| J-03 | The app drains all transitions, ignores releases for rules, then calls `advance()` with only the final `isHolding` and final cursor position. | Press/release and cursor history inside a dropped frame is lost; Slider parts may be judged from a later state rather than their scheduled state. | Covered by the timestamped-input contract test; a dedicated GREEN design is required in Stage 3. |
| J-04 | `SpinnerRuntime.sample()` has no timestamp and `ObjectScheduler.advance()` calls it at most once per RAF. | Identical pointer motion can produce different rotation at different RAF rates, violating TRD 14.3 and browser trace requirements. | `spinner-timestamped-trace.json` |
| J-05 | Queued press results are appended before `scheduler.advance()` emits elapsed Miss/Slider events. | Events with earlier authoritative times can be applied after a later press, changing combo/score/HP order. | Must be covered when Stage 3 introduces a single timestamp-ordered rule timeline. |
| J-06 | Slider part acquisition uses the one cursor/hold state supplied for `currentTimeMs`, even though it evaluates every crossed `part.timeMs`. | Dropped-frame catch-up is exhaustive in count but not historically accurate in state. | Same timestamped-input contract as J-03. |

### Non-findings retained as invariants

- Circle timing comparisons are inclusive and late Miss occurs only after the 50
  boundary.
- Input channels are independent, keyboard repeat is ignored, and synthetic
  release does not create a press.
- `FrameCoordinator` reads map time once per RAF.
- Rule modules remain free of DOM, Canvas, AudioNode, and LocalStorage imports.

## Stage 2 — RED regression contract

The original RED contracts now live in `tests/unit/judgementPipeline.test.js`; normative case
data lives under `tests/fixtures/rules/848234/`. Expected values were written from
PRD/TRD/baseline requirements and the authoritative Hard map SHA-256, not generated
from current implementation output.

Expected RED failures before Stage 3:

1. A Slider head press inside its 50 window returns no head acquisition.
2. An earlier Slider head fails to notelock a later Circle.
3. A timestamped Spinner trace is ignored because scheduler input is RAF-state
   based rather than event-timeline based.

These failures are the completion evidence for Stage 2. They must not be skipped,
weakened, or changed to match current output. Stage 3 starts by making the focused
suite GREEN with the smallest coherent scheduler/rules change.

### Verification recorded 2026-08-30

The following was the historical Stage 2 RED checkpoint before implementation:

- Typecheck: pass.
- ESLint: pass.
- Existing suite with the RED file excluded: 50 files, 216 tests passed.
- Focused Stage 2 suite: 1 file, 3 tests failed as specified above.
- At that checkpoint the ordinary full test/release gate was deliberately red.

## Stages 3–5 completion

- Stage 3: Circle and Slider heads share one chronological notelock candidate
  list; elapsed automatic events and later presses are applied by map time.
- Stage 4: Slider heads require press input inside the inclusive 50 window.
  Scheduled tick, repeat, and tail results use the held channels and cursor
  snapshot at their own timestamps, including dropped-frame catch-up.
- Stage 5: active pointer movement is queued with AudioClock-derived map time and
  Spinner rotation consumes that ordered trace. A single-frame trace and the same
  trace split across frames produce the same result.
- These changes affect stored comparable results, so the completed ruleset is
  `RULESET_VERSION = 3`. The old version 2 result keys remain isolated.

Stage 5 verification:

- Focused judgement/input/Slider/Spinner tests: green.
- Full Vitest suite, ESLint, and JavaScript typecheck: green.
- Local browser smoke: gameplay entered successfully; debug HUD recorded one
  press for each of mouse-left, mouse-right, Z, and X; hold returned to zero;
  no console errors or warnings were reported.
- Content validation, Vite production bundle, and dist validation: green and
  within the 35 MiB production budget.
