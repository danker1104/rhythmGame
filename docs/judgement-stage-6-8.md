# Judgement Improvement Stages 6–8

This record closes the implementation stages that follow the timestamped object
pipeline in Stages 3–5. PRD, TRD, and `docs/rules-baseline.md` remain normative.

## Stage 6 — Chronological result state

- A frame's scheduled events are stable-sorted by authoritative `mapTimeMs`.
- Passive HP drain is applied only for the active interval before each event.
- ScoreV1, combo, accuracy counters, Slider breaks, Spinner bonus, and HP are
  updated together at that point in the timeline.
- Equal timestamps preserve scheduler order. This matters for Slider tail-part
  combo followed by the whole-Slider result.
- HP failure is latched after every drain segment and event. Remaining events
  and drain in that frame are discarded, so a later hit cannot revive the play.
- These result-affecting changes start `RULESET_VERSION = 4`.

The regression cases cover an early hit that heals before the remainder of a
dropped frame, an out-of-order event array where an earlier Miss fails first,
and equal-time Slider part/final ordering.

## Stage 7 — Clock and interruption boundaries

- DOM event timestamps are mapped to AudioClock map time before entering rules.
- Timestamp conversion fallbacks are counted as a bounded diagnostic metric.
- Focus loss, hidden document, pointer interruption, fullscreen exit, and pause
  discard every undrained transition and synthesize releases for held channels.
- Resume resets the frame coordinator. Its first update is a zero-duration
  interval at the current AudioClock map time, preventing pause-time HP drain.
- Dropped frames are advanced by the complete map-time interval, never RAF count.

## Stage 8 — Bounded judgement diagnostics

Development diagnostics retain at most 64 structured entries in memory. They do
not contain player identity, free-form user input, asset contents, or network
data. The debug HUD exposes enough evidence to answer:

1. Which Circle or Slider head was the notelock candidate for the last press?
2. Was it accepted, outside the radius, or outside every timing window?
3. What were the signed timing error, cursor distance, raw audio time, map time,
   configured offset, active input channels, pending input count, and timestamp
   fallback count?
4. Which rule event was applied, and what score/combo/HP/failure state changed?

The diagnostics are observational only: the scheduler callback and state
snapshots do not participate in candidate selection, judgement, or scoring.
