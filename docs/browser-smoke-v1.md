# Browser Smoke v1

Run this checklist against a production bundle at 1920×1080, 1366×768 and
1024×768. Record every result in `release-evidence/browser-smoke-v1.json` with
the exact browser version, OS, timestamp, verifier and screenshot/log path.

Required cases are the normative `BS-01` through `BS-12` definitions in TRD
section 22.4. A case passes only when its expected result is observed. `blocked`
is evidence of an incomplete Gate B, not a pass.

## Short local smoke

1. Confirm no audio before the start gesture and `running` after it.
2. Check all five difficulty IDs and eight displayed statistics.
3. Start Insane and verify Canvas backing size equals CSS size × effective DPR.
4. Exercise mouse-left, mouse-right, both configured keys and multi-hold.
5. Pause, resume, restart and return to difficulty selection.
6. Reload and confirm settings and a completed best result are restored.
7. Inspect console warnings/errors and failed network requests.
8. Repeat in Chrome, Edge and Firefox. Record unsupported automation as
   `blocked`; do not infer a pass from Chromium.

## Performance profile

Use the TRD reference machine and `?debug=1`. Select Insane, allow a 10-second
warm-up, then record 120 seconds three times in both Chrome and Edge. Required:

- average FPS ≥ 59;
- p95 frame time ≤ 20ms;
- frames over 33.3ms < 1%;
- no increase in retained AudioBuffer/ImageBitmap, listener or RAF counts after
  ten restarts.

Headless or shortened samples are diagnostics only and cannot satisfy Gate B.
