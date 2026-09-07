# Presentation stages 6–8

## Stage 6 — Song Select

- Replaced the temporary native-selector presentation with a semantic osu! Table / Song Select surface.
- The five MEGALOVANIA difficulties are rendered as an expandable listbox-style card rail while the native select remains available to assistive technology.
- Arrow-key selection wraps across the difficulty list and keeps the native value, statistics, and selected card synchronized.
- Preview playback uses the catalogued `previewTimeMs` value (15.984 seconds), the existing Web Audio graph, and the selected master/music volume settings.
- Starting gameplay stops preview playback before entering the loading state.

## Stage 7 — gameplay and result presentation

- Gameplay, pause, failure, and result states retain the game-flow presentation instead of revealing Song Select behind the modal surface.
- Returning to difficulty selection is the only transition that restores Song Select.
- Result rank parsing preserves the two-character `SS` rank and resolves it to the YUGEN `ranking-X.png` asset.
- Spinner progress, hit feedback timing, follow-point animation limits, spinner sound, and high-resolution YUGEN fallback behavior are covered by the Stage 3–5 implementation and regression suite.

## Stage 8 — integrated verification

Fresh in-app browser verification was performed at the 1280×720 reference viewport and responsive 1366×768 and 1024×768 viewports:

- all five difficulty cards were present and one card was selected;
- expand/collapse and wrapped keyboard navigation worked;
- preview started at the catalogued offset and stopped cleanly;
- preview-to-game transition entered the `is-playing is-gameflow` state;
- failure retained `is-gameflow`, displayed the failure dialog, and reduced the Song Select panel to a 1×1 clipped region;
- returning from failure restored Song Select and retained the selected difficulty;
- both responsive viewports had no horizontal document overflow;
- the browser console contained no warning/error entries, only expected Vite and YUGEN diagnostic information.

The connected test environment exposes only Codex In-app Browser. Chrome, Edge, Firefox, and Vercel Preview smoke evidence therefore remains a release-candidate gate and is not represented as freshly passed by this implementation run. Public Production deployment remains blocked by the redistribution-rights gate in `TRD.md`.
