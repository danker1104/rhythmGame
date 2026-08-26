---
name: web-rhythm-game
description: Implement, test, debug, or refactor this repository's Vanilla JavaScript 4Key web rhythm game from PRD.md and TRD.md. Use for the osu!mania parser, Web Audio timing, Canvas/YUGEN rendering, input and judgement, game UI, local records, leaderboard, or 1v1 match work in gameProject.
---

# Web Rhythm Game

Build the game specified by the repository, preserving its timing correctness and curated assets.

## Ground in the project

Before changing implementation code:

1. Read `PRD.md` and `TRD.md` completely from the repository root. Treat them as the product and technical sources of truth.
2. Inspect the current code, tests, manifests, and package scripts. Do not assume a planned file already exists.
3. Inspect only the resource files needed by the requested slice. Do not recursively load the entire skin into context.
4. Identify the requested milestone or the smallest incomplete acceptance criterion. Do not silently advance to later phases.

If the documents conflict with the actual assets or implementation, report the concrete conflict before making a choice that changes behavior. Small implementation details not fixed by the documents may use the least complex option consistent with both documents.

## Implement vertical slices

Deliver one observable behavior end to end, including its relevant test and error handling, before starting another. Keep changes within the user's requested phase.

For test-first requests, also use the installed `tdd` skill. Let `tdd` govern the red-green loop and public-seam confirmation; this skill supplies the rhythm-game invariants and acceptance criteria.

Read [references/implementation-gates.md](references/implementation-gates.md) for the subsystem being changed and apply only its relevant gate.

## Preserve these invariants

- The MVP has one song, `The Last Page`, with Easy, Normal, Hard, and Insane beatmaps.
- Keep the curated `- YUGEN -/` and song source directories intact. Do not delete, rename, reorganize, or rewrite their files unless the user explicitly requests asset maintenance.
- Use Vanilla JavaScript ES modules, Vite, HTML/CSS, Canvas 2D, and Web Audio API. Do not introduce React, a game framework, or a UI component framework without an explicit architecture change.
- Use `AudioContext.currentTime` through the audio clock as the sole gameplay time source. Never accumulate frame deltas for note positions or judgement.
- Keep parsing, game state, judgement/scoring, rendering, audio, input, storage, and online adapters separable. Pure rules must not depend on DOM, Canvas, network, or wall-clock globals.
- Load assets through explicit manifests. Never load every remaining YUGEN file at startup.
- The current maps use Soft samples. Exclude empty, zero-frame, or unsupported WAV files from manifests rather than failing the game.
- Resolve skin filenames case-insensitively in development while emitting deployment paths with the real on-disk casing.
- Keep online leaderboard and 1v1 modules optional. The full local game must work without Supabase configuration.
- Do not claim exact osu! ruleset compatibility; follow the scoring and judgement rules versioned in `TRD.md`.

## Verify the slice

Run the narrowest relevant automated tests, then the repository's broader check or build when the change can affect integration. For browser-visible or audio/input behavior, perform an actual browser check when browser control is available.

Verification must use observable outcomes: parsed fixture values, state transitions, rendered UI, audio-clock continuity, input behavior, or production asset resolution. Do not accept tests that only mirror implementation constants.

At handoff, report:

- behavior completed and the PRD/TRD requirement it satisfies;
- files changed;
- tests and browser flows run with results;
- any requirement intentionally deferred or blocked.

Do not deploy, publish, commit, push, create Supabase resources, or mutate remote state unless the user explicitly requests that action.
