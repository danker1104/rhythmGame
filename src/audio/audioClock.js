export class AudioClock {
  #context;
  #state = 'stopped';
  #sourceStartedAt = 0;
  #resumeOffsetMs = 0;
  #userOffsetMs = 0;

  constructor(context) {
    this.#context = context;
  }

  get state() {
    return this.#state;
  }

  get playbackOffsetMs() {
    if (this.#state === 'running') {
      return this.#resumeOffsetMs + (this.#context.currentTime - this.#sourceStartedAt) * 1000;
    }
    return this.#resumeOffsetMs;
  }

  get songTimeMs() {
    return this.playbackOffsetMs + this.#userOffsetMs;
  }

  setUserOffsetMs(offsetMs) {
    if (!Number.isFinite(offsetMs)) throw new TypeError('User offset must be a finite number');
    this.#userOffsetMs = offsetMs;
  }

  start(offsetMs = 0) {
    if (!Number.isFinite(offsetMs) || offsetMs < 0) {
      throw new RangeError('Playback offset must be a non-negative finite number');
    }
    this.#resumeOffsetMs = offsetMs;
    this.#sourceStartedAt = this.#context.currentTime;
    this.#state = 'running';
  }

  pause() {
    if (this.#state === 'running') {
      this.#resumeOffsetMs = this.playbackOffsetMs;
      this.#state = 'paused';
    }
    return this.#resumeOffsetMs;
  }

  resume() {
    if (this.#state !== 'paused') throw new Error('Audio clock can only resume from paused state');
    this.#sourceStartedAt = this.#context.currentTime;
    this.#state = 'running';
    return this.#resumeOffsetMs;
  }

  stop() {
    this.#resumeOffsetMs = 0;
    this.#sourceStartedAt = 0;
    this.#state = 'stopped';
  }
}

