# Repository Guidelines

## Source of Truth

- Read `PRD.md` for product scope and acceptance criteria before changing behavior.
- Read `TRD.md` for architecture, data contracts, formulas, fixtures, and deployment rules.
- Read `PRD.md` and `TRD.md` before changing gameplay rendering, HUD layout, cursor feedback, hit-object presentation, input overlay, or result presentation. `play.mp4` is the accepted reference recording; `gameex.md` still describes the superseded `ordr-video.mp4` contract and must be revised before it is used as an implementation authority.
- Treat the PRD and TRD as authoritative for rules, architecture, and the accepted `play.mp4` presentation observations. Do not let the legacy `gameex.md` override them.
- Base every implementation on `PRD.md` and `TRD.md`. If a gameplay presentation, layout, animation, feedback, transition, or interaction detail is missing, underspecified, or ambiguous in those documents, you MUST inspect and follow `play.mp4` before deciding or implementing it. Record any newly accepted presentation contract back into PRD/TRD (and later the revised `gameex.md`) instead of relying on memory. This mandatory video fallback does not authorize deriving judgement, ScoreV1, HP, object data, or timing formulas from rendered frames.
- Keep the MVP limited to osu!standard, the five provided MEGALOVANIA difficulties, and the `- YUGEN -` skin unless the documents are intentionally revised.
- If a requested change conflicts with either document, surface the conflict instead of silently changing the contract.

## Current State

- This repository contains specifications, source content, an application scaffold, tests, generated public content, and prior build output. Inspect the actual scripts and current files before reporting project status.
- The specifications now target YUGEN v3, but existing source code, tests, generated `public/` content, and prior `dist/` output may still target azer8 v2 until the migration is implemented. Do not describe the runtime migration as complete based on these document changes alone.
- Do not report build, lint, typecheck, unit-test, browser-check, or smoke-test success until the corresponding scripts or documented manual checks have been implemented and run.
- Do not add React, Vue, WebGL, Three.js, a server runtime, or Vercel Functions to the MVP.

## Required Stack

- Use Vite, HTML5, CSS3, JavaScript ES2022+, native ES modules, JSDoc, and `// @ts-check`.
- Use one gameplay Canvas 2D surface. Keep menus, forms, dialogs, and accessibility controls in semantic HTML.
- Use Web Audio API as the single authoritative clock for music, gameplay, rendering, and storyboard timing. `requestAnimationFrame` is only a render signal.
- Use `osu-parsers` 4.1.7 and `osu-standard-stable` 5.0.1 with a compatible `osu-classes` peer version. Pin exact versions in the lockfile.
- Use Vitest for rules, adapters, state transitions, and integration tests.
- Use the TRD browser checklist and short smoke procedures for Chrome, Edge, Firefox, and Vercel Preview. Do not add a long-running automated browser E2E suite to the MVP.

## Architecture Boundaries

- Keep judgement, ScoreV1, combo, accuracy, HP, and object progression as deterministic pure logic.
- Modules under `src/rules/` must not import DOM, Canvas, AudioNode, or LocalStorage APIs.
- Convert parser-library instances to plain application DTOs inside adapters; do not expose parser objects to UI or storage.
- UI and renderers consume engine events. They must not decide judgement outcomes.
- `AudioClock` supplies time but does not judge objects. Read map time once per frame and pass the same value through update and render.
- Resolve song and skin paths through versioned catalogs and manifests. Never hardcode MEGALOVANIA filenames in engine logic.
- Preserve one-way dependencies described in `TRD.md`; avoid circular imports and shared mutable globals.

## Original Content

- Never modify, rename, delete, or optimize files inside `387700 toby fox - MEGALOVANIA/` or the outer `- YUGEN -/` source directory.
- Treat `387700 toby fox - MEGALOVANIA/` as the authoritative song source and the files directly inside the outer `- YUGEN -/` directory as the authoritative skin source. Ignore the identical nested `- YUGEN -/- YUGEN -/` copy when inventorying or preparing content. The `azer8 midnight edit/` and older `#azer8midnight v1/` folders are retained reference material, not active skin sources. Do not replace authoritative content with generated demo audio, placeholder maps, a synthetic skin, or unrelated assets.
- You MUST use the outer `- YUGEN -/` folder as the active skin for all MVP implementation, generated manifests, runtime asset lookup, browser validation, and release evidence. Do not mix in, silently fall back to, or restore assets from azer8 or another skin except for an explicitly documented application fallback when the YUGEN contract permits it. The user shorthand `-YUGEN-` refers to the exact on-disk folder name `- YUGEN -/`.
- Generate deployable copies under URL-safe `public/content/` and `public/skins/` paths with `scripts/prepare-content.mjs`.
- Make `scripts/prepare-content.mjs` read from the authoritative song directory and only the direct files in the outer `- YUGEN -/` skin directory. Generate the active skin under `/skins/v3/yugen/`. The web app must load only generated catalog and manifests under `public/`; it must not request the original Windows folder names directly at runtime.
- Validate that every deployed song, beatmap, storyboard, skin image, and sound resolves back to an allowlisted file from the two source directories. Record source-relative path, byte size, SHA-256, role, MIME type, and audio decode policy in generated manifests.
- Preserve exact filename case. Normalize map `\` separators to `/`, use the URL API for encoding, and reject absolute paths, drive letters, traversal, and case-only conflicts.
- Resource precedence is beatmap root, then skin, then application fallback. An exact explicit-silence match stops fallback.
- Exclude `desktop.ini`, `Thumbs.db`, unused modes/modifiers, and assets outside the validated dependency closure from production output.

## Content Edge Cases

- Parse the active skin's normal `[General]` section directly. Do not carry the older skin's `¬[General]` recovery into the active fixture or implement broad garbage stripping.
- Apply duplicate INI keys with last-valid-value wins. Do not guess-correct `HitCircleOverlayAboveNumer`.
- Use `sliderb0.png` as a static single Slider Ball frame. `SliderBallFrames: 60` does not authorize requests for nonexistent `sliderb1..59.png` files.
- Treat transparent placeholder images as valid assets.
- Treat documented empty or zero-data WAV files in either the beatmap source or active skin as intentional silence. The active skin's `drum-sliderslide.wav` and `normal-sliderwhistle.wav` are zero-byte explicit-silence files and must stop fallback without reaching `decodeAudioData()`.
- Do not require nonexistent YUGEN `sliderstartcircle*`, `sliderendcircleoverlay*`, or unnumbered `followpoint.png` assets. Use the documented Standard fallback roles; a present transparent placeholder still stops fallback.
- Resolve map-local hitsounds and failure assets before skin assets.
- Merge the selected `.osu` storyboard with the shared `.osb` using the ordering and layer rules in `TRD.md`. A storyboard failure must not stop music or gameplay.

## Gameplay Invariants

- Use `play.mp4` only as evidence for the presentation contract recorded in `PRD.md` and `TRD.md`; do not use rendered frames to derive judgement, ScoreV1, HP, object data, or authoritative timing formulas. The observed replay score, accuracy, UR, pp, input trace, and map/video offset are presentation evidence, not rule fixtures.
- Preserve the 1280×720 reference composition: a centered 768×576 Standard playfield at `(256, 72)`, a 960×720 storyboard surface at `(160, 0)`, darkened full-screen background, cyan YUGEN cursor with an intentionally transparent trail, top HUD, right input overlay, lower combo/timing bar, break storyboard, and YUGEN result presentation.

- Keep Standard playfield coordinates at 512×384 and storyboard coordinates at 640×480. At the 1280×720 reference viewport use the documented Standard scale 1.5 with offset `(256, 72)` and storyboard scale 1.5 with offset `(160, 0)`; derive equivalent transforms and the inverse pointer mapping for other viewports without non-uniform scaling.
- Normalize mouse-left, mouse-right, `KeyZ`, and `KeyX` as independent press/release channels. Any active channel maintains Slider or Spinner hold.
- Ignore keyboard repeat as a new press. Clear held input and pause on focus loss, hidden documents, interrupted audio, or fullscreen exit during play.
- Use the documented offset sign: positive offset advances map time relative to decoded audio position.
- Process every elapsed Miss, Slider part, and scheduled event across dropped frames; never advance gameplay by frame count.
- Increment `RULESET_VERSION` whenever a rules change would make stored results incomparable.

## Build and Validation

- Implement the script contract from `TRD.md`: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `validate:content`, and `release:verify`.
- Make `npm run build` delegate to `release:verify`; only the internal `build:bundle` step may invoke `vite build` after all required checks pass.
- After changing pure behavior, run the narrowest relevant Vitest test first. After changing browser behavior, perform the narrowest applicable TRD browser checklist or smoke procedure.
- Before local release-candidate completion, run `release:verify` and the documented browser smoke checklist. Run Preview smoke checks only after the rights gate permits a Vercel upload.
- Do not require Playwright, a `test:e2e` script, or a long-running automated browser E2E suite for MVP completion.
- Add regression fixtures for exact-case paths, known skin recovery, intentional silence, all five map statistics, storyboard ordering, judgement boundaries, ScoreV1, HP, pause/resume, and multi-channel input.
- Do not weaken a project regression fixture or change a documented baseline merely to make a test pass. External osu!stable comparison data is optional and does not block implementation or release.

## Installed Skills

- Use `game-engine` for Canvas game-loop, rendering, input, and performance guidance.
- Use `game-audio` for Web Audio lifecycle, gain routing, scheduling, and browser validation; this project's real MP3/WAV playback contract overrides that skill's procedural-audio examples.
- Use `test-driven-development` for rules, parser adapters, state transitions, and bug fixes.

## Deployment and Rights

- Keep the application functional as a static, serverless Vite build.
- Keep total production output at or below the 35 MiB budget and emit a per-file and per-role size report.
- Verify direct asset requests, MIME types, byte ranges, cache behavior, refresh behavior, and audio permission handling on Vercel.
- Do not publish a public Vercel Production deployment until redistribution rights for audio, beatmaps, backgrounds/storyboards, and the skin are documented. Before approval, use local development or an access-restricted Preview only.
- Do not describe the project as an official osu! client or imply endorsement.

## Change Discipline

- Make the smallest change that satisfies the current requirement; do not refactor unrelated areas.
- Preserve user changes and original assets. Never use destructive Git commands.
- Update `PRD.md` for intentional product-scope changes and `TRD.md` for intentional technical-contract changes.
- Update `gameex.md` before implementing the accepted `play.mp4` presentation contract; until then, treat its `ordr-video.mp4` observations as superseded wherever they conflict with PRD/TRD.
- Do not commit, create branches, deploy, or alter source assets unless the user explicitly requests it.
