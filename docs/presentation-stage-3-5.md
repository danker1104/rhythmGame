# Presentation Stage 3–5 completion note

> Completed: 2026-08-31  
> Authority: `PRD.md`, `TRD.md`, `gameex.md`, and `play.mp4`

## Stage 3 — HitObject presentation

- Circle and Slider-head appearance remains driven by the shared AR preempt/fade calculation.
- Judgement sprites and Slider-part effects now begin at the event's authoritative map timestamp. A dropped render frame therefore shortens an already-elapsed effect instead of replaying it late.
- Combo colours, combo digits, approach circles, and YUGEN judgement bitmaps remain renderer-only consumers of rules events.

## Stage 4 — Slider and Spinner presentation

- YUGEN follow points cycle only through the manifest-backed `followpoint-0..2.png` sequence.
- Slider rendering continues to use the canonical Hit Circle head, transparent tail, static `sliderb0.png`, ticks, repeat arrows, and tracking-only follow circle.
- Spinner rendering now includes a map-time countdown and required-spin progress ring.
- `spinnerspin.wav` is a held-input loop during an active Spinner; `spinnerbonus.wav` remains a distinct clear/bonus event sound. Cleanup stops the loop on release, scene exit, pause, restart, or result.

## Stage 5 — YUGEN contract

- The active source remains the direct files in the outer `- YUGEN -/` directory and the generated `/skins/v3/yugen/` manifest.
- The obsolete malformed `¬[General]` recovery was removed. Active YUGEN parsing requires its normal `[General]` section.
- A browser decode failure for an exact `@2x` PNG retries only that bitmap's exact normal-resolution YUGEN counterpart. It does not mix another skin or invent a Canvas replacement.
- Transparent placeholders and explicit-silence audio continue to stop fallback.

## Verification

- Focused Stage 3–5 tests: 35 passed before integration.
- Full suite after implementation: 54 test files, 240 tests passed.
- Content validation: 76 beatmap files, 178 skin files, 82 storyboard/audio references (65 unique).
- Production bundle and `dist/` validation passed within the 35 MiB budget.
- In-app browser: difficulty selection and gameplay entry succeeded at high DPR; no console warnings or errors were observed. An unassisted Insane run reached the expected Failed result flow.
