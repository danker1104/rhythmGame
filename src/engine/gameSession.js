import { JudgementEngine } from '../judgement/judgementEngine.js';
import { applyJudgement, createScoreState } from '../judgement/scoreEngine.js';

export class GameSession {
  #judgement;
  #score;

  constructor(notes) {
    this.#judgement = new JudgementEngine(notes);
    this.#score = createScoreState(notes.length);
  }

  get score() {
    return this.#score;
  }

  get finalizedNoteIds() {
    return this.#judgement.finalizedNoteIds;
  }

  #apply(events) {
    for (const event of events) this.#score = applyJudgement(this.#score, event.judgement);
    return events;
  }

  press(lane, songTimeMs) {
    return this.#apply(this.#judgement.press(lane, songTimeMs));
  }

  release(lane, songTimeMs) {
    return this.#apply(this.#judgement.release(lane, songTimeMs));
  }

  update(songTimeMs) {
    return this.#apply(this.#judgement.update(songTimeMs));
  }
}
