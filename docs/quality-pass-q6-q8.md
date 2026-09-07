# Quality pass Q6–Q8

Verified: 2026-09-05 (Windows, Asia/Seoul)

## Q6 — micro-interactions and UI sound

- Kept motion short and purposeful: hover/press/focus, carousel selection, dialog entry, and scene transition use shared easing and transform/opacity-first transitions.
- Removed infinite decorative motion and added the existing reduced-motion override. Gameplay timing and the Canvas cursor trail remain outside CSS animation.
- Added the authoritative outer `- YUGEN -/` sounds `menuhit.wav`, `menuclick.wav`, `menuback.wav`, and `whoosh.wav` to the generated v3 skin closure. No source asset was edited.
- UI sounds are optional, begin only after a user gesture, route through the effect gain, obey master/effect volume, and share one decoded-load promise. Offline or decode failure leaves the interaction usable.
- No generated artwork was needed: the active YUGEN skin already supplied appropriate art and sound assets, so Canva/Higgsfield were not used.

## Q7 — measured performance

In-app browser diagnostic run used `?debug=1&profile=1`, Insane, Storyboard enabled.

| Sample | Average FPS | p95 frame | Frames >33.3 ms | Active hit objects | Draw calls |
|---|---:|---:|---:|---:|---:|
| 12 s / map 8.5 s | 59.93 | 16.80 ms | 0.00% | 3 | 17 |
| 32 s / map 32.0 s | 59.94 | 16.90 ms | 0.00% | 3 | 12 |

The samples meet the TRD goal (average FPS at least 59, p95 at most 20 ms, under 1% frames over 33.3 ms). No renderer architecture change was justified. The quality pass removed costly layout/filter transitions found during the interface audit, while preserving static skin blur and glow.

Focused regressions cover the bounded frame metric window, DPR-capped resize transform restoration, Storyboard scheduler generation cleanup, exactly one live music source after ten restarts, and one shared UI-audio load during twenty rapid selections. A full 120-second × 3 browser benchmark remains the formal release profile procedure; these shorter readings are implementation diagnostics.

## Q8 — final interface and release audit

- Added intrinsic dimensions and alternative-text policy to every image, a theme colour, named/autocomplete-aware form controls, a keyboard skip link, visible focus, safe-area padding, contained overscroll, balanced title wrapping, and touch-safe button behavior.
- Removed unpausable infinite decoration and prohibited height/filter transitions. Reduced-motion users receive effectively instant, single-iteration motion.
- Verified the five-option carousel and Insane statistics in the in-app browser. The Q0–Q8 visual delta retains the previously accepted Chrome 151, Edge 151, and Firefox 154 evidence in `release-evidence/browser-smoke-v1.json`; the current in-app diagnostic showed the refreshed selection UI and gameplay without a blocking error.
- Preserved the rights gate: no Preview or Production deployment was attempted.

## Final gates

- `npm run release:verify`: pass
- ESLint: pass
- JavaScript typecheck: pass
- Vitest: 58 files, 256 tests passed
- Prepared content: 76 beatmap files, 182 YUGEN skin files, 27,939,533 bytes
- Static `dist/`: 28,386,011 / 36,700,160 bytes
- No azer8 runtime dependency or unsupported post-MVP control was introduced.
