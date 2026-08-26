export class EffectManager {
  #context;
  #output;
  #maxVoices;
  #buffers = new Map();
  #decodePromises = new Map();
  #activeSources = new Set();

  constructor(context, output, { maxVoices = 8 } = {}) {
    this.#context = context;
    this.#output = output;
    this.#maxVoices = maxVoices;
  }

  async load(key, arrayBuffer) {
    if (this.#buffers.has(key)) return this.#buffers.get(key);
    if (this.#decodePromises.has(key)) return this.#decodePromises.get(key);
    if (!(arrayBuffer instanceof ArrayBuffer)) throw new TypeError('Effect data must be an ArrayBuffer');

    const promise = this.#context.decodeAudioData(arrayBuffer.slice(0)).then((buffer) => {
      this.#buffers.set(key, buffer);
      this.#decodePromises.delete(key);
      return buffer;
    }).catch((error) => {
      this.#decodePromises.delete(key);
      throw error;
    });
    this.#decodePromises.set(key, promise);
    return promise;
  }

  play(key) {
    const buffer = this.#buffers.get(key);
    if (!buffer) return false;

    if (this.#activeSources.size >= this.#maxVoices) {
      const oldest = this.#activeSources.values().next().value;
      this.#activeSources.delete(oldest);
      oldest.onended = null;
      oldest.stop();
    }

    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#output);
    source.onended = () => this.#activeSources.delete(source);
    this.#activeSources.add(source);
    source.start();
    return true;
  }

  stopAll() {
    for (const source of this.#activeSources) {
      source.onended = null;
      source.stop();
    }
    this.#activeSources.clear();
  }
}

