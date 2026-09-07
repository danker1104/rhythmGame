// @ts-check

import { describe, expect, it } from 'vitest';
import { AudioClock } from '../../src/audio/audioClock.js';

function createContext() {
  return {
    currentTime: 10,
    getOutputTimestamp: () => ({ contextTime: 9.9, performanceTime: 20_000 }),
  };
}

describe('AudioClock', () => {
  it('uses the documented positive offset sign', () => {
    const context = createContext();
    const clock = new AudioClock(context, 20);
    clock.start(9, 0);
    expect(clock.getRawAudioPositionMs()).toBe(1000);
    expect(clock.getMapTimeMs()).toBe(1020);
  });

  it('freezes at pause and resumes from a new context start time', () => {
    const context = createContext();
    const clock = new AudioClock(context, 0);
    clock.start(9, 250);
    expect(clock.pause()).toBe(1250);
    context.currentTime = 20;
    expect(clock.getRawAudioPositionMs()).toBe(1250);
    clock.start(20, 1250);
    context.currentTime = 20.5;
    expect(clock.getRawAudioPositionMs()).toBe(1750);
  });

  it('maps a DOM event timestamp through getOutputTimestamp within 2ms', () => {
    const context = createContext();
    const clock = new AudioClock(context, 20);
    clock.start(9, 0);
    const result = clock.eventTimestampToMapTime(20_050);
    expect(result.fallback).toBe(false);
    expect(result.mapTimeMs).toBeCloseTo(970, 9);
  });

  it('falls back to handler time when output timestamps are invalid', () => {
    const context = createContext();
    context.getOutputTimestamp = () => ({ contextTime: Number.NaN, performanceTime: Number.NaN });
    const clock = new AudioClock(context, 0);
    clock.start(9, 0);
    expect(clock.eventTimestampToMapTime(20_050)).toEqual({ mapTimeMs: 1000, fallback: true });
  });
});
