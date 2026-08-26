import { JUDGEMENT_WINDOWS_MS } from '../config/gameConfig.js';

export function judgeTiming(errorMs) {
  const absoluteError = Math.abs(errorMs);
  if (absoluteError <= JUDGEMENT_WINDOWS_MS.perfect) return 'perfect';
  if (absoluteError <= JUDGEMENT_WINDOWS_MS.great) return 'great';
  if (absoluteError <= JUDGEMENT_WINDOWS_MS.good) return 'good';
  return 'miss';
}

export class JudgementEngine {
  #laneNotes = Array.from({ length: 4 }, () => []);
  #laneIndexes = [0, 0, 0, 0];
  #activeHolds = new Map();
  #finalized = new Set();

  constructor(notes) {
    for (const note of notes) this.#laneNotes[note.lane].push(note);
    for (const lane of this.#laneNotes) {
      lane.sort((left, right) => left.startTimeMs - right.startTimeMs || left.id - right.id);
    }
  }

  get finalizedCount() {
    return this.#finalized.size;
  }

  get finalizedNoteIds() {
    return new Set(this.#finalized);
  }

  #advanceLane(lane) {
    const notes = this.#laneNotes[lane];
    while (this.#laneIndexes[lane] < notes.length && this.#finalized.has(notes[this.#laneIndexes[lane]].id)) {
      this.#laneIndexes[lane] += 1;
    }
  }

  #finalize(note, judgement, timingErrorMs) {
    if (this.#finalized.has(note.id)) return null;
    this.#finalized.add(note.id);
    this.#advanceLane(note.lane);
    return { noteId: note.id, judgement, timingErrorMs };
  }

  press(lane, songTimeMs) {
    const events = this.update(songTimeMs);
    if (this.#activeHolds.has(lane)) return events;
    this.#advanceLane(lane);
    const note = this.#laneNotes[lane][this.#laneIndexes[lane]];
    if (!note) return events;

    const timingErrorMs = songTimeMs - note.startTimeMs;
    if (timingErrorMs < -JUDGEMENT_WINDOWS_MS.good) return events;
    const judgement = judgeTiming(timingErrorMs);
    if (judgement === 'miss') return events;

    if (note.kind === 'hold') {
      this.#activeHolds.set(lane, { note, startJudgement: judgement, startErrorMs: timingErrorMs });
      this.#laneIndexes[lane] += 1;
      return events;
    }

    const event = this.#finalize(note, judgement, timingErrorMs);
    if (event) events.push(event);
    return events;
  }

  release(lane, songTimeMs) {
    const events = [];
    const active = this.#activeHolds.get(lane);
    if (!active) return events;
    this.#activeHolds.delete(lane);

    const earlyByMs = active.note.endTimeMs - songTimeMs;
    const event = earlyByMs > JUDGEMENT_WINDOWS_MS.good
      ? this.#finalize(active.note, 'miss', -earlyByMs)
      : this.#finalize(active.note, active.startJudgement, active.startErrorMs);
    if (event) events.push(event);
    return events;
  }

  update(songTimeMs) {
    const events = [];

    for (const [lane, active] of [...this.#activeHolds]) {
      if (songTimeMs >= active.note.endTimeMs) {
        this.#activeHolds.delete(lane);
        const event = this.#finalize(active.note, active.startJudgement, active.startErrorMs);
        if (event) events.push(event);
      }
    }

    for (let lane = 0; lane < 4; lane += 1) {
      this.#advanceLane(lane);
      const notes = this.#laneNotes[lane];
      while (this.#laneIndexes[lane] < notes.length) {
        const note = notes[this.#laneIndexes[lane]];
        if (songTimeMs <= note.startTimeMs + JUDGEMENT_WINDOWS_MS.good) break;
        const event = this.#finalize(note, 'miss', songTimeMs - note.startTimeMs);
        if (event) events.push(event);
        this.#advanceLane(lane);
      }
    }

    return events;
  }
}
