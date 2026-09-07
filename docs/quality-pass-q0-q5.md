# Quality Pass Q0-Q5 Evidence

Date: 2026-09-05

## Baseline finding

The existing selection screen used the correct MEGALOVANIA background and YUGEN assets, but its centered document-like panel, horizontal scrollbar, equally weighted cards, basic result dialog, and flat settings list did not read as a cohesive rhythm-game flow.

## Accepted direction

- Keep the MEGALOVANIA background visible as the full-screen atmosphere.
- Use YUGEN `mode-osu*`, `selection-tab`, `songselect-bottom`, `ranking-*`, `section-*`, and `pause-*` imagery as primary visual material.
- Use a selected-centered five-difficulty carousel with wrapped relative positions.
- Keep motion limited to selection and scene presentation; gameplay remains AudioClock/map-time driven.
- Keep the essential HUD while allowing only supplementary judgement/timing and input-overlay visibility changes.
- Keep FPS as an opt-in diagnostic setting.

## Browser observations

- Verified selection at the current in-app browser viewport with all five difficulties.
- Verified pointer selection from Insane to Hard and updated stats/heading.
- Verified animated collapse/expand state: hidden region reaches zero height/opacity with pointer input disabled.
- Verified settings expansion and persisted HUD detail, input overlay, and FPS toggles across reload; restored defaults afterward.
- Verified selection -> loading -> gameplay -> failed result -> selection flow.
- Verified map-local failure artwork and YUGEN-skinned Retry/Back actions in the result presentation.

## Automated evidence

- Focused Q0-Q5 tests: 6 files, 35 tests passed before the full gate.
- `npm run release:verify`: 56 files, 250 tests passed.
- Content validation: 76 beatmap files, 178 skin files, 82 storyboard/audio references, 65 unique.
- Distribution validation: 27,800,935 / 36,700,160 bytes.

## Asset decision

No generated image was required. Every planned Q0-Q5 role was covered by the authoritative YUGEN v3 and MEGALOVANIA assets. Creating a replacement through Canva, Figma, or Higgsfield would have conflicted with the active-skin source-of-truth and increased the production dependency closure without improving a missing role.
