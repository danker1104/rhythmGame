# Implementation Plan: Final Quality Improvement Pass

## Overview

Improve the existing osu!standard web game without rebuilding its gameplay core. Scope starts at the referenced conversation's request for an overall quality pass: song select, scene transitions, gameplay HUD, results, settings, micro-interactions, performance, and final consistency.

## Current Baseline

- Catalog-driven difficulty selection, preview playback, settings, gameplay HUD, pause/fail/result flow, and local best records already exist.
- Circle, Slider, Spinner, AudioClock, YUGEN v3, and storyboard behavior already have regression coverage.
- Baseline on 2026-09-05: `npm test -- --reporter=dot` passed 55 files and 244 tests.
- The completed YUGEN migration remains authoritative through PRD/TRD and existing tests.

## Architecture and Scope Decisions

- Preserve Vite, semantic HTML, one Canvas 2D gameplay surface, Web Audio clock, native modules, and current rules/scene boundaries.
- CSS motion is allowed for menus/dialogs only; gameplay objects and judgement stay map-time driven.
- Keep the MVP to one MEGALOVANIA song, five difficulties, and YUGEN v3.
- Defer search, sort, favorites, recent plays, random, Next Song, and skin selection to the documented multi-song/post-MVP phase.
- Do not add HitCircle-size overrides because rendering must agree with CS judgement geometry.
- Do not synthesize a cursor trail; YUGEN's trail is intentionally transparent.
- Use `play.mp4` only for presentation comparison, never for gameplay formulas or fixtures.
- Update PRD/TRD before implementing any new presentation contract not already specified.

## Dependency Order

```text
Audit and contract lock
  -> Song select structure and motion
  -> Scene transitions
  -> HUD and results
  -> Settings and micro-feedback
  -> Performance
  -> Browser/release verification
```

## Tasks

### Q0.1: Capture the current visual baseline

**Description:** Inspect the current app at 1280x720 and TRD smoke sizes; record concrete gaps in selection, transitions, HUD, result flow, settings, focus, and motion.

**Acceptance criteria:**
- [ ] Gap list separates missing behavior from already implemented behavior.
- [ ] Screenshots/logs cover the key flow and supported viewport sizes.
- [ ] Each proposed change is allowed by PRD/TRD or marked for a document update.

**Verification:** Narrow browser checks for selection, gameplay entry, pause, result, and return; clean console and failed-request list.

**Dependencies:** None  
**Files likely touched:** `PRD.md`, `TRD.md`, `release-evidence/`  
**Estimated scope:** Medium

### Q1.1: Stabilize the difficulty carousel model

**Description:** Extend the existing song-select model with deterministic positions, selected/neighbor states, wheel and keyboard navigation, and reduced-motion behavior.

**Acceptance criteria:**
- [ ] All five difficulties wrap and position predictably.
- [ ] Wheel, arrows, pointer, and focus select exactly one item.
- [ ] Rapid changes cannot let stale preview/loading state replace the latest selection.

**Verification:** Focused Vitest coverage plus keyboard/wheel checks at 1280x720 and 1024x768.

**Dependencies:** Q0.1  
**Files likely touched:** `src/ui/songSelectPresentation.js`, `src/app/circleSliceApp.js`, focused unit/integration tests  
**Estimated scope:** Medium

### Q1.2: Polish cards and expand/collapse motion

**Description:** Refine current markup/CSS so the selected difficulty is unmistakable, neighbors retain context, and expansion uses short natural easing without layout jumps.

**Acceptance criteria:**
- [ ] Selected, hover, focus, loading/disabled, and neighbor states are distinct.
- [ ] Rapid interaction stays smooth and `prefers-reduced-motion` is honored.
- [ ] Required controls stay in the viewport at all TRD smoke sizes.

**Verification:** Presentation tests; manual focus-order, resize, and rapid-selection checks.

**Dependencies:** Q1.1  
**Files likely touched:** `index.html`, `src/styles.css`, `src/app/circleSliceApp.js`, presentation tests  
**Estimated scope:** Medium

### Q1.3: Add background and preview crossfades

**Description:** Use the selected catalog background as the selection backdrop and coordinate blur, dim, title fade, and preview crossfade while preserving AudioEngine ownership.

**Acceptance criteria:**
- [ ] Background changes never flash blank or affect gameplay/storyboard layering.
- [ ] Preview changes use bounded fades and keep one active preview source.
- [ ] Repeated switching reuses cached audio and leaves no stale source/listener.

**Verification:** Focused audio/selection tests and manual rapid switching with console/network inspection.

**Dependencies:** Q1.2  
**Files likely touched:** `src/app/circleSliceApp.js`, `src/audio/audioEngine.js`, `src/styles.css`, focused tests  
**Estimated scope:** Medium

## Checkpoint A: Song select

- [ ] Q0-Q1 tests pass.
- [ ] Mouse, wheel, and keyboard operation pass.
- [ ] No stale loads, duplicate sources, console errors, or viewport overflow.
- [ ] User reviews the visual direction before it is reused across scenes.

### Q2.1: Add cancellable scene presentation phases

**Description:** Add enter/exit presentation phases around selection, loading, ready, gameplay, pause, fail, and result without weakening the scene state machine.

**Acceptance criteria:**
- [ ] Selection -> gameplay and gameplay -> result -> selection transitions are visible and cancellable.
- [ ] Motion never alters AudioClock, input queues, judgement timing, or pause semantics.
- [ ] Reduced motion preserves state feedback without nonessential movement.

**Verification:** Scene interruption tests and full-flow check confirming one RAF/source and no double action.

**Dependencies:** Checkpoint A  
**Files likely touched:** `src/app/sceneMachine.js`, `src/app/circleSliceApp.js`, `src/styles.css`, scene tests  
**Estimated scope:** Medium

### Q3.1: Improve HUD hierarchy and visibility options

**Description:** Refine the existing score, accuracy, HP, judgements, input overlay, combo, progress/timing bar, and pause affordance while keeping the accepted 1280x720 composition.

**Acceptance criteria:**
- [ ] Essential HUD stays readable without obscuring objects.
- [ ] Optional detail visibility persists and cannot affect results.
- [ ] K1/K2/M1/M2 and YUGEN cursor keep documented roles and z-order.

**Verification:** HUD layout/render tests, pixel-order probes, and focused browser gameplay check.

**Dependencies:** Q2.1  
**Files likely touched:** `src/renderer/gameplayHud.js`, `src/renderer/playfieldRenderer.js`, app/settings glue, focused tests  
**Estimated scope:** Medium

### Q4.1: Build a staged YUGEN result presentation

**Description:** Present score, accuracy, max combo, 300/100/50/Miss, Slider breaks, Spinner bonus, rank, and best-record state with restrained count-up and rank reveal.

**Acceptance criteria:**
- [ ] Displayed values exactly match the finalized result object.
- [ ] Retry and Back are clear and cannot fire twice; Next Song is omitted.
- [ ] Reveal is skippable, reduced-motion safe, and never delays persistence.

**Verification:** Pure presentation tests for clear/fail/new-best/retained-best and manual result flows.

**Dependencies:** Q2.1  
**Files likely touched:** `index.html`, `src/app/circleSliceApp.js`, `src/skin/sceneSkinPresentation.js`, `src/styles.css`, tests  
**Estimated scope:** Medium

### Q5.1: Reorganize settings and add safe toggles

**Description:** Improve grouping, labels, live values, keyboard use, reset, and persistence for current audio, offset, dim, storyboard, cursor, keys, and fullscreen settings; add only HUD/FPS display toggles.

**Acceptance criteria:**
- [ ] Settings round-trip through LocalStorage and reset correctly.
- [ ] Key conflict, unsupported fullscreen, and storage failure have explicit feedback.
- [ ] No skin selector or HitCircle-size override appears in MVP.

**Verification:** Storage/settings tests and tab-order, reset, reload, fullscreen, and fallback checks.

**Dependencies:** Q3.1  
**Files likely touched:** `index.html`, app settings glue, `src/storage/localRepository.js`, `src/styles.css`, tests  
**Estimated scope:** Medium

### Q6.1: Standardize micro-interactions and UI sound

**Description:** Apply consistent hover, press, focus, selection glow, number-update, loading, and permitted YUGEN sound feedback to important actions only.

**Acceptance criteria:**
- [ ] Motion tokens are consistent; no state relies on color/animation alone.
- [ ] Sounds obey master/effect volume, explicit silence, gesture rules, and source caps.
- [ ] No gameplay-timing CSS animation or procedural cursor trail is introduced.

**Verification:** Focused interaction/sound tests and rapid-click, mute, reduced-motion, keyboard-only checks.

**Dependencies:** Q4.1, Q5.1  
**Files likely touched:** `src/styles.css`, app UI glue, `src/audio/audioEngine.js`, focused tests  
**Estimated scope:** Medium

## Checkpoint B: Complete flow

- [ ] Selection -> loading -> play -> pause/resume -> result/fail -> retry/back passes.
- [ ] Settings and records survive reload.
- [ ] Full Vitest suite passes.
- [ ] Presentation remains within PRD/TRD and `play.mp4` evidence rules.

### Q7.1: Profile and optimize measured bottlenecks

**Description:** Measure selection transitions, rapid preview changes, Insane plus storyboard, ten restarts, resize/DPR, and result motion; optimize only demonstrated bottlenecks.

**Acceptance criteria:**
- [ ] Gameplay meets the TRD 60 FPS goal and under 1% frames over 33.3ms on the reference machine.
- [ ] Ten restarts do not accumulate RAFs, listeners, buffers, or sources.
- [ ] Selection blur/images cause no persistent jank or duplicate downloads.

**Verification:** Record before/after metrics; run performance, cache, load-generation, and renderer tests.

**Dependencies:** Checkpoint B  
**Files likely touched:** Only profiled bottlenecks and their focused tests  
**Estimated scope:** Medium per bottleneck

### Q8.1: Final consistency and release verification

**Description:** Normalize typography, spacing, contrast, focus, motion, wording, and error/loading feedback, then run browser and repository gates.

**Acceptance criteria:**
- [ ] Chrome, Edge, and Firefox pass applicable `browser-smoke-v1` cases with evidence.
- [ ] No azer8 assets, unsupported controls, deployment, or deferred features are introduced.
- [ ] Static output stays within 35 MiB and original assets remain untouched.

**Verification:** `npm run release:verify`; required browser evidence; `npm run release:local` only when evidence is complete.

**Dependencies:** Q7.1  
**Files likely touched:** Presentation modules, tests/evidence, and PRD/TRD only for accepted contracts  
**Estimated scope:** Medium

## Risks

| Risk | Mitigation |
|---|---|
| Polish changes gameplay timing | Keep menu motion outside map-time logic; retain clock/input regression tests |
| One-song MVP gains misleading controls | Defer multi-song controls to PRD Stage 4 |
| Blur and transitions cause jank | Profile first, cap effects, honor reduced motion |
| Animation causes stale loads/double actions | Make phases cancellable; test load generation and source ownership |
| YUGEN contract is violated | Use only v3 manifest roles and preserve transparent/silent assets |
| Completed systems are rebuilt | Audit first and implement only observed gaps |

## Approval Gate

Implementation starts after user review. Recommended first slice: Q0.1, then Q1.1-Q1.2, because song select has the largest visible impact and defines the later motion language.
