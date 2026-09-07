# Final quality improvement pass

- [x] Q0.1: capture the current visual/interaction baseline and contract gaps
- [x] Q1.1: stabilize the five-difficulty carousel model and navigation
- [x] Q1.2: polish card layout, selected state, and expand/collapse motion
- [x] Q1.3: add catalog-background and audio-preview crossfades

## Checkpoint A: Song select

- [x] focused tests pass
- [x] mouse, wheel, keyboard, focus, resize, and rapid-selection checks pass
- [x] no stale load, duplicate audio source, console error, or overflow
- [x] visual direction implemented from the approved Q-stage request

- [x] Q2.1: add cancellable presentation phases to the existing scene flow
- [x] Q3.1: improve HUD hierarchy and safe visibility options
- [x] Q4.1: build staged YUGEN result presentation with Retry and Back
- [x] Q5.1: reorganize existing settings and add safe HUD/FPS toggles
- [x] Q6.1: standardize restrained micro-motion and permitted UI sounds

## Checkpoint B: Complete flow

- [x] selection -> loading -> play -> result/fail -> retry/back passes; existing pause/resume regression remains green
- [x] settings and best records survive reload
- [x] full Vitest suite passes
- [x] presentation remains within PRD/TRD and `play.mp4` evidence rules

- [x] Q7.1: profile and optimize only measured selection/gameplay bottlenecks
- [x] Q8.1: complete final visual, accessibility, browser, and release verification

## Deferred until documented post-MVP scope

- [ ] multi-song search, sort, filters, favorites, recent plays, random, and Next Song
- [ ] additional skin selection
- [ ] HitCircle-size override
- [ ] online and modifier features
