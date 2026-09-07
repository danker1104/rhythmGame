// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../../src/audio/audioEngine.js';

function createFakeContext() {
  /** @type {any[]} */
  const sources = [];
  /** @type {any[]} */
  const gains = [];
  const context = {
    currentTime: 5,
    state: 'running',
    destination: { name: 'destination' },
    createGain() {
      /** @type {any[]} */
      const connections = [];
      const gainParam = { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(function (/** @type {number} */ value) { this.value = value; }), linearRampToValueAtTime: vi.fn(function (/** @type {number} */ value) { this.value = value; }) };
      const gain = { gain: gainParam, connections, connect(/** @type {any} */ target) { connections.push(target); } };
      gains.push(gain);
      return gain;
    },
    createBufferSource() {
      /** @type {any[]} */
      const connections = [];
      /** @type {any[][]} */
      const starts = [];
      const source = {
        buffer: null, connections, starts, stopped: false,
        connect(/** @type {any} */ target) { connections.push(target); },
        start(/** @type {number} */ when, /** @type {number} */ offset) { starts.push([when, offset]); },
        stop() { this.stopped = true; },
      };
      sources.push(source);
      return source;
    },
    decodeAudioData: vi.fn(async () => ({ duration: 10 })),
    resume: vi.fn(async () => { context.state = 'running'; }),
    addEventListener: vi.fn((/** @type {string} */ type, /** @type {()=>void} */ listener) => { if (type === 'statechange') context.stateListener = listener; }),
    stateListener: /** @type {null|(()=>void)} */ (null),
  };
  return { context, sources, gains };
}

describe('AudioEngine', () => {
  it('creates the documented music/effect/story/master gain graph', async () => {
    const { context, gains } = createFakeContext();
    const engine = new AudioEngine(() => context);
    await engine.unlockFromGesture();

    expect(gains).toHaveLength(4);
    expect(gains[0].connections).toEqual([gains[3]]);
    expect(gains[1].connections).toEqual([gains[3]]);
    expect(gains[2].connections).toEqual([gains[3]]);
    expect(gains[3].connections).toEqual([context.destination]);
  });

  it('does not fetch or decode manifest-declared silence', async () => {
    const { context } = createFakeContext();
    const fetcher = vi.fn();
    const engine = new AudioEngine(() => context, fetcher);
    await engine.unlockFromGesture();

    const handle = await engine.loadAudio('/silent.wav', { decodePolicy: 'silent' });
    expect(handle).toEqual({ kind: 'silent' });
    expect(fetcher).not.toHaveBeenCalled();
    expect(context.decodeAudioData).not.toHaveBeenCalled();
  });

  it('ramps preview music without creating an additional source', async () => {
    const { context, sources, gains } = createFakeContext();
    const engine = new AudioEngine(() => context);
    await engine.unlockFromGesture();
    engine.setVolumes({ music: 0.8 });
    engine.playMusic({ duration: 10 }, 1000, 220);
    expect(sources).toHaveLength(1);
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0, 5);
    expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, 5.22);
  });

  it('stops a paused source and creates a new source when resumed', async () => {
    const { context, sources } = createFakeContext();
    const engine = new AudioEngine(() => context);
    await engine.unlockFromGesture();
    engine.playMusic({ duration: 10 }, 1000);
    context.currentTime = 5.5;
    expect(engine.pause()).toBe(1500);
    expect(sources[0].stopped).toBe(true);
    engine.resumeMusic();
    expect(sources).toHaveLength(2);
    expect(sources[1].starts[0]).toEqual([0, 1.5]);
    expect(engine.generation).toBe(2);
  });

  it('keeps exactly one live music source across ten consecutive restarts', async () => {
    const { context, sources } = createFakeContext();
    const engine = new AudioEngine(() => context);
    await engine.unlockFromGesture();
    engine.playMusic({ duration: 10 }, 0);

    for (let index = 0; index < 10; index += 1) engine.restart(0);

    expect(engine.generation).toBe(11);
    expect(sources).toHaveLength(11);
    expect(sources.slice(0, -1).every((source) => source.stopped)).toBe(true);
    expect(sources.at(-1)?.stopped).toBe(false);
    expect(engine.musicSource).toBe(sources.at(-1));
  });

  it('pauses once when the context is interrupted and requires gesture resume', async () => {
    const { context, sources } = createFakeContext();
    const interrupted = vi.fn();
    const engine = new AudioEngine(() => context, undefined, interrupted);
    await engine.unlockFromGesture();
    engine.playMusic({ duration: 10 }, 0);
    context.currentTime = 5.25;
    context.state = 'interrupted';
    context.stateListener?.();
    context.stateListener?.();
    expect(sources[0].stopped).toBe(true);
    expect(interrupted).toHaveBeenCalledOnce();
    await engine.resumeFromGesture();
    expect(sources).toHaveLength(2);
    expect(sources[1].starts[0]).toEqual([0, 0.25]);
  });
});
