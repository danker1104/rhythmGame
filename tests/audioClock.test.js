import { describe, expect, it } from 'vitest';

import { AudioClock } from '../src/audio/audioClock.js';

describe('AudioClock', () => {
  it('derives song time only from AudioContext.currentTime', () => {
    const context = { currentTime: 10 };
    const clock = new AudioClock(context);
    clock.setUserOffsetMs(15);
    clock.start(2000);

    context.currentTime = 10.5;
    expect(clock.songTimeMs).toBe(2515);
  });

  it('preserves playback position across pause and resume', () => {
    const context = { currentTime: 4 };
    const clock = new AudioClock(context);
    clock.start(1000);

    context.currentTime = 4.75;
    expect(clock.pause()).toBe(1750);
    context.currentTime = 20;
    expect(clock.songTimeMs).toBe(1750);

    clock.resume();
    context.currentTime = 20.25;
    expect(clock.playbackOffsetMs).toBe(2000);
  });
});

