# Rules Baseline

This document is the normative record for deterministic gameplay rules. Values are
versioned with stored results and must not be changed without incrementing
`RULESET_VERSION` once comparable results exist.

## Version

- `RULESET_VERSION`: `4`
- Scope: osu!standard-style single-player MVP with no modifiers
- Mod multiplier: `1.0`

Version 2 latches failure as soon as HP reaches zero. Later events from the same
frame cannot restore HP or produce a comparable completed result; version 1
local results remain isolated by the versioned result key.

Version 3 unifies Circle and Slider-head press candidates under one notelock
order, makes Slider heads press-driven across the inclusive 50 window, evaluates
Slider parts from timestamped input state, and accumulates Spinner rotation from
timestamped pointer movement rather than RAF samples. Version 2 local results
remain isolated because these fixes can change judgement, combo, score, and HP.

Version 4 applies passive HP drain and all ScoreV1/combo/HP events in one stable,
authoritative map-time order. Events at the same timestamp retain scheduler order;
failure is checked after each drain segment and event, and later events in that
frame are discarded after failure. It also clears undrained input transitions on
interruption so a pre-pause press cannot judge an object after resume. Version 3
local results remain isolated because these fixes can change score, combo, HP,
and completion state on dropped frames or interruption boundaries.

## External reference policy

- PRD, TRD, and this baseline are the normative gameplay contract for the MVP.
- The target is the documented osu!stable-style Standard and ScoreV1 behaviour,
  not the current default osu!lazer scoring mode.
- The official `ppy/osu` repository is an implementation and boundary-test
  reference. It does not silently replace a project rule when stable, Classic,
  and current lazer behaviour differ.
- In particular, Slider head, tick, repeat, tail, whole-Slider judgement, combo,
  and score behaviour follow TRD sections 13.4, 14.2, and 15.1–15.3. Current
  lazer Slider results must not be mixed into this ruleset piecemeal.
- `play.mp4` is presentation evidence only. Rendered frames, replay score, UR,
  pp, and the observed recording offset are not rule or timing fixtures.
- Any intentional normative change requires a written baseline/TRD update,
  independently authored expected fixtures, and a `RULESET_VERSION` increment
  before comparable results are stored under the new behaviour.

## Numeric policy

- Use JavaScript `Number` operations in the written formula order.
- Times are milliseconds and map coordinates are logical pixels.
- Keep fractional AR, CS, and OD results until the final consumer explicitly
  requires integer conversion.
- A hit-window comparison is inclusive: `abs(hitError) <= window`.
- Object score additions discard the positive fractional part with `Math.floor`.
- Difficulty multiplier uses `Math.round` exactly once at the end of its formula.
- Ratio thresholds described as “greater than” are strict; “at most” is inclusive.

## Difficulty formulas

- AR below 5: `1200 + 120 * (5 - AR)`.
- AR equal to 5: `1200`.
- AR above 5: `1200 - 150 * (AR - 5)`.
- Fade-in duration: `preempt * 2 / 3`.
- Circle radius: `54.4 - 4.48 * CS`.
- OD windows: 300=`80 - 6 * OD`, 100=`140 - 8 * OD`,
  50=`200 - 10 * OD`.

## Result rank

Evaluate SS, S, A, B, C, then D in that order using the exact conditions in
TRD section 15.5. An empty result is D and is not a completed play.

## Slider and Spinner constants

- Slider follow radius: `2.4 * object radius`.
- Legacy Slider tail leniency: the adapter-provided legacy tail time, currently
  `min(36ms, spanDuration / 2)` before the visual end.
- Spinner centre cutoff: ignore samples closer than `16px` to `(256, 192)`.
- Spinner maximum accepted angular delta per pointer sample: `pi / 2` radians.
- On a direction change, the first opposite signed angular sample establishes the
  new direction and contributes no rotation. Either sustained direction is valid.
- Minimum spins per second: `1.5 + 0.2 * OD` below OD5, otherwise
  `1.25 + 0.25 * OD`.
- Required full spins: `trunc(durationSeconds * minimumSpinsPerSecond + 0.5)`.
- Spinner results: 300 at the requirement, 100 at one full spin below it, 50 at
  25% of it, otherwise Miss. Each full spin after clear is one bonus.

## HP constants

- Initial HP: `1.0`; clamp every change to the inclusive `0..1` range.
- Passive drain per active second: `0.01 + 0.002 * HPDrainRate`.
- Break intervals use half-open overlap duration and stop passive drain.
- Final object gains: 300=`+0.06`, 100=`+0.03`, 50=`+0.015`, Miss=`-0.14`.
- Acquired Slider part: `+0.01`.
- Each Spinner bonus spin after clear: `+0.01`.
- Apply elapsed passive drain before events at the current map time. HP reaching
  zero transitions to failed immediately and failure remains latched.

These project constants were fixed before comparable results were stored and
complete ruleset version 1. They are deterministic project rules rather than a
claim of byte-identical osu!stable health simulation.

## Required regression fixtures

All release-required rules fixtures live under `tests/fixtures/rules/`, carry
`RULESET_VERSION`, and record the relevant Beatmap ID and source map SHA-256.

| Fixture | Contract locked |
|---|---|
| `circle-boundaries.json` | Inclusive 300/100/50 timing boundaries for Hard OD 7.2 |
| `score-v1-sequence.json` | Difficulty rounding, per-object flooring, cumulative score, accuracy and rank |
| `slider-sequences.json` | Dropped-frame part processing, follow radius, legacy tail time and final part ratio |
| `spinner-boundaries.json` | All five map OD requirements, 300/100/50/Miss boundaries and bonus spins |
| `health-sequences.json` | All five HP values, active drain, break exclusion, judgement gain and failure |

Expected values are derived from the formulas in this document and include a
human-readable `basis`; they must not be regenerated from the implementation
under test. External comparison data belongs in `tests/fixtures/comparison/`
and does not replace these project fixtures.

## Storyboard command ordering

Commands are evaluated per property. A command becomes authoritative at its
inclusive start time and keeps its end value until a later-declared applicable
command starts.

| Case | Priority |
|---|---|
| Different start times | The command with the latest start not after map time |
| Same start time | The command declared later in the object |
| Partial or complete overlap | The later command takes over at its start |
| Zero duration | Apply its end value immediately at the start time |

Animation frames use `floor((mapTime - objectStart) / frameDelay)` and
`LoopForever` wraps by frame count. RAF count never participates.
