// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { StoryboardSampleScheduler } from '../../src/storyboard/storyboardSampleScheduler.js';

describe('StoryboardSampleScheduler', () => {
  it('schedules samples once inside the look-ahead window on story gain', () => {
    const stop = vi.fn();
    const audio = { context: { currentTime: 4 }, generation: 2, playEffect: vi.fn(() => ({ stop })) };
    const scheduler = new StoryboardSampleScheduler(audio, [{ id: 'sample', startTimeMs: 1000, path: 'voice.wav', volume: 0.8 }], new Map([['voice.wav', {}]]));
    scheduler.update(925);
    scheduler.update(950);
    expect(audio.playEffect).toHaveBeenCalledOnce();
    expect(audio.playEffect).toHaveBeenCalledWith({}, 'storyboard', 4.075, 0.8);
  });

  it('cancels previous sources and permits rescheduling after generation changes', () => {
    const first = { stop: vi.fn() };
    const second = { stop: vi.fn() };
    const sources = [first, second];
    const audio = { context: { currentTime: 1 }, generation: 1, playEffect: vi.fn(() => sources.shift()) };
    const scheduler = new StoryboardSampleScheduler(audio, [{ id: 'sample', startTimeMs: 1000, path: 'voice.wav', volume: 1 }], new Map([['voice.wav', {}]]));
    scheduler.update(950);
    audio.generation = 2;
    scheduler.update(950);
    expect(audio.playEffect).toHaveBeenCalledTimes(2);
    expect(first.stop).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(0);
  });

  it('schedules a crossed sample immediately after a dropped frame', () => {
    const audio = { context: { currentTime: 5 }, generation: 1, playEffect: vi.fn(() => ({ stop: vi.fn() })) };
    const scheduler = new StoryboardSampleScheduler(audio, [{ id: 'sample', startTimeMs: 1000, path: 'voice.wav', volume: 1 }], new Map([['voice.wav', {}]]));
    scheduler.update(850);
    scheduler.update(1100);
    expect(audio.playEffect).toHaveBeenCalledWith({}, 'storyboard', 5, 1);
  });

  it('does not replay a past sample after pause or seek changes generation', () => {
    const source = { stop: vi.fn() };
    const audio = { context: { currentTime: 5 }, generation: 1, playEffect: vi.fn(() => source) };
    const scheduler = new StoryboardSampleScheduler(audio, [{ id: 'sample', startTimeMs: 1000, path: 'voice.wav', volume: 1 }], new Map([['voice.wav', {}]]));
    scheduler.update(950);
    audio.generation = 2;
    scheduler.update(1200);

    expect(source.stop).toHaveBeenCalledOnce();
    expect(audio.playEffect).toHaveBeenCalledOnce();
  });
});
