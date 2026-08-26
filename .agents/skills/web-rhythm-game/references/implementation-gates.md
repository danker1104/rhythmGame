# Implementation Gates

Read only the section relevant to the current change.

## Foundation and content manifest

- Keep source assets in `- YUGEN -/` and `1276332 ARForest - The Last Page/`; copy only manifest-selected deployment assets into `public/`.
- The content manifest must expose one song and four stable difficulty IDs: `easy`, `normal`, `hard`, and `insane`.
- Production URLs must respect Vite's base URL and real filename casing.
- A missing optional visual or effect sound may fall back; missing audio, selected beatmap, or required Mania note texture must block play with an actionable error.

## Beatmap parser

- Accept only Mania mode (`Mode: 3`) and four keys (`CircleSize: 4`).
- Parse General, Metadata, Difficulty, Events, TimingPoints, and HitObjects as defined in `TRD.md`.
- Convert x coordinates with `min(3, floor(x * 4 / 512))`.
- Parse tap and hold notes; reject a hold end earlier than its start.
- Preserve stable chronological ordering.
- Assert the checked-in fixture values:

| Difficulty | Hit objects | Long notes | First/last note |
|---|---:|---:|---:|
| Easy | 547 | 81 | 7.550s / 136.626s |
| Normal | 831 | 108 | 7.550s / 136.626s |
| Hard | 1,214 | 25 | 7.550s / 136.626s |
| Insane | 1,408 | 152 | 7.550s / 136.626s |

## Audio and effects

- Unlock the AudioContext from a user gesture.
- Cache decoded song and effect AudioBuffers; create a fresh source node for each play.
- Preserve song-time continuity across pause and resume by storing the playback offset.
- Route music and effects through separate gain nodes under a master gain.
- Preload only short sounds needed by the next scene. Lazy-load long result MP3s and multiplayer sounds.
- Effect playback must never change the gameplay clock or judgement timestamp.

## Input, judgement, and score

- Store key bindings with `KeyboardEvent.code`; default to `KeyD`, `KeyF`, `KeyJ`, `KeyK`.
- Ignore repeated keydown events and clear pressed state on blur or visibility loss.
- Use the versioned judgement windows and scoring formula from `TRD.md`; test exact boundaries independently.
- Index pending notes per lane rather than scanning all notes per key event.
- A note receives one final judgement. Hold notes track press, held state, and release.
- HP reaching zero marks failure without stopping the MVP song.

## Canvas and YUGEN skin

- Scale the backing canvas by devicePixelRatio while retaining the 640×480 logical coordinate system.
- Apply the selected 4Key Mania block from `Skin.ini`; do not accidentally read 5K–8K blocks.
- Prefer `@2x` textures on high-density displays while keeping the same logical size.
- Compose scenes from the asset roles documented in `TRD.md`, rather than treating any single image as a complete screen.
- Cull off-screen notes and avoid per-frame parsing, image lookup, or avoidable allocation.
- Verify Insane with 1,408 objects at the target frame rate.

## Scenes, settings, and local records

- Maintain a single owner for keyboard input and animation frames during scene transitions.
- Require the selected beatmap, decoded song, and essential Mania textures before entering PLAYING.
- Pause automatically on focus loss.
- Validate LocalStorage data and recover corrupt or out-of-range values with defaults.
- Compare best results by score, then accuracy, then maximum combo.

## Online phases

- Do not start this gate until the user requests leaderboard or multiplayer work.
- Hide online features cleanly when Supabase configuration is absent.
- Keep Supabase behind the repository interfaces specified in `TRD.md`.
- Use anonymous authentication and RLS; never expose a service-role key to the browser.
- Treat realtime opponent progress as display-only data. It must not affect local judgement.
- Use a server-derived start time and rate-limit progress updates.

## Release gate

- Run unit tests, production build, and the complete browser flow for all four difficulties where practical.
- Check direct delivery and MIME handling for `.osu`, `.ini`, `.mp3`, and `.wav` assets.
- Check Linux-sensitive filename casing before Vercel deployment.
- Repeated retry and scene transitions must not duplicate input listeners, animation frames, or long-lived audio nodes.
