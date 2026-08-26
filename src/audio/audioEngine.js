export class AudioEngine {
  #context;
  #output;
  #clock;
  #buffers = new Map();
  #decodePromises = new Map();
  #source = null;
  #currentKey = null;
  #previewEndOffsetMs = null;

  constructor(context, output, clock) {
    this.#context = context;
    this.#output = output;
    this.#clock = clock;
  }

  get isPlaying() {
    return this.#source !== null && this.#clock.state === 'running';
  }

  has(key) {
    return this.#buffers.has(key);
  }

  async load(key, arrayBuffer) {
    if (this.#buffers.has(key)) return this.#buffers.get(key);
    if (this.#decodePromises.has(key)) return this.#decodePromises.get(key);
    if (!(arrayBuffer instanceof ArrayBuffer)) throw new TypeError('Audio data must be an ArrayBuffer');

    const decodePromise = this.#context.decodeAudioData(arrayBuffer.slice(0)).then((buffer) => {
      this.#buffers.set(key, buffer);
      this.#decodePromises.delete(key);
      return buffer;
    }).catch((error) => {
      this.#decodePromises.delete(key);
      throw error;
    });

    this.#decodePromises.set(key, decodePromise);
    return decodePromise;
  }

  #stopSource() {
    if (!this.#source) return;
    const source = this.#source;
    this.#source = null;
    source.onended = null;
    source.stop();
  }

  #startSource(offsetMs) {
    const buffer = this.#buffers.get(this.#currentKey);
    if (!buffer) throw new Error(`Audio buffer is not loaded: ${this.#currentKey}`);

    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#output);
    source.onended = () => {
      if (this.#source !== source) return;
      this.#source = null;
      this.#clock.pause();
    };
    this.#source = source;

    if (this.#previewEndOffsetMs === null) {
      source.start(0, offsetMs / 1000);
    } else {
      const remainingMs = Math.max(0, this.#previewEndOffsetMs - offsetMs);
      source.start(0, offsetMs / 1000, remainingMs / 1000);
    }
  }

  play(key, { offsetMs = 0, durationMs = null } = {}) {
    if (!this.#buffers.has(key)) throw new Error(`Audio buffer is not loaded: ${key}`);
    if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs <= 0)) {
      throw new RangeError('Playback duration must be a positive finite number');
    }

    this.#stopSource();
    this.#currentKey = key;
    this.#previewEndOffsetMs = durationMs === null ? null : offsetMs + durationMs;
    this.#clock.start(offsetMs);
    this.#startSource(offsetMs);
  }

  playPreview(key, offsetMs, durationMs = 15_000) {
    this.play(key, { offsetMs, durationMs });
  }

  pause() {
    if (!this.isPlaying) return this.#clock.playbackOffsetMs;
    const offsetMs = this.#clock.pause();
    this.#stopSource();
    return offsetMs;
  }

  resume() {
    if (this.#clock.state !== 'paused' || !this.#currentKey) {
      throw new Error('Audio is not paused');
    }
    const offsetMs = this.#clock.resume();
    this.#startSource(offsetMs);
  }

  stop() {
    this.#stopSource();
    this.#currentKey = null;
    this.#previewEndOffsetMs = null;
    this.#clock.stop();
  }
}

