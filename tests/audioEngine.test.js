import { describe, expect, it, vi } from 'vitest';

import { createAudioSystem } from '../src/audio/audioSystem.js';

function createFakeContext() {
  const sources = [];
  const gains = [];
  const context = {
    currentTime: 5,
    destination: { kind: 'destination' },
    decodeAudioData: vi.fn(async () => ({ duration: 140 })),
    createGain: vi.fn(() => {
      const node = { gain: { value: 1 }, connections: [], connect(target) { this.connections.push(target); } };
      gains.push(node);
      return node;
    }),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        connections: [],
        start: vi.fn(),
        stop: vi.fn(),
        connect(target) { this.connections.push(target); },
        onended: null,
      };
      sources.push(source);
      return source;
    }),
  };
  return { context, sources, gains };
}

describe('AudioEngine', () => {
  it('caches decoded music and creates a fresh source for resume', async () => {
    const { context, sources } = createFakeContext();
    const { audioEngine, clock } = createAudioSystem(context);
    const data = new ArrayBuffer(8);

    await audioEngine.load('song', data);
    await audioEngine.load('song', data);
    audioEngine.play('song', { offsetMs: 2000 });

    context.currentTime = 5.5;
    expect(clock.songTimeMs).toBe(2500);
    expect(audioEngine.pause()).toBe(2500);
    context.currentTime = 20;
    audioEngine.resume();

    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(2);
    expect(sources[0].start).toHaveBeenCalledWith(0, 2);
    expect(sources[1].start).toHaveBeenCalledWith(0, 2.5);
  });

  it('routes music and effects separately below the master gain', () => {
    const { context, gains } = createFakeContext();
    const system = createAudioSystem(context);

    system.setMasterVolume(0.7);
    system.setMusicVolume(0.5);
    system.setEffectVolume(0.25);

    expect(gains).toHaveLength(3);
    expect(system.gains.master.gain.value).toBe(0.7);
    expect(system.gains.music.gain.value).toBe(0.5);
    expect(system.gains.effect.gain.value).toBe(0.25);
    expect(system.gains.music.connections).toContain(system.gains.master);
    expect(system.gains.effect.connections).toContain(system.gains.master);
    expect(system.gains.master.connections).toContain(context.destination);
  });

  it('plays a bounded preview from the configured song position', async () => {
    const { context, sources } = createFakeContext();
    const { audioEngine } = createAudioSystem(context);
    await audioEngine.load('song', new ArrayBuffer(8));

    audioEngine.playPreview('song', 98934, 15000);

    expect(sources[0].start).toHaveBeenCalledWith(0, 98.934, 15);
  });
});

describe('EffectManager', () => {
  it('reuses a decoded buffer while creating sources per play and stealing the oldest voice', async () => {
    const { context, sources } = createFakeContext();
    const { effects } = createAudioSystem(context, { maxEffectVoices: 2 });
    const data = new ArrayBuffer(8);

    await effects.load('click', data);
    await effects.load('click', data);
    effects.play('click');
    effects.play('click');
    effects.play('click');

    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(3);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources.every(({ start }) => start.mock.calls.length === 1)).toBe(true);
  });
});
