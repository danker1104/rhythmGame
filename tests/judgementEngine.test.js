import { describe, expect, it } from 'vitest';

import { JudgementEngine, judgeTiming } from '../src/judgement/judgementEngine.js';

const tap = (id, lane, startTimeMs) => ({ id, lane, startTimeMs, endTimeMs: null, kind: 'tap', hitSound: 0 });
const hold = (id, lane, startTimeMs, endTimeMs) => ({ id, lane, startTimeMs, endTimeMs, kind: 'hold', hitSound: 0 });

describe('judgeTiming', () => {
  it.each([
    [0, 'perfect'], [45, 'perfect'], [-45, 'perfect'],
    [46, 'great'], [70, 'great'], [-70, 'great'],
    [71, 'good'], [120, 'good'], [-120, 'good'],
    [121, 'miss'], [-121, 'miss'],
  ])('classifies %ims as %s', (errorMs, judgement) => {
    expect(judgeTiming(errorMs)).toBe(judgement);
  });
});

describe('JudgementEngine', () => {
  it('judges one nearest pending note per lane exactly once', () => {
    const engine = new JudgementEngine([tap(0, 0, 1000), tap(1, 0, 1200)]);

    expect(engine.press(0, 1030)).toEqual([{ noteId: 0, judgement: 'perfect', timingErrorMs: 30 }]);
    expect(engine.press(0, 1030)).toEqual([]);
    expect(engine.press(0, 1190)).toEqual([{ noteId: 1, judgement: 'perfect', timingErrorMs: -10 }]);
    expect(engine.finalizedCount).toBe(2);
  });

  it('automatically misses notes only after the 120ms window', () => {
    const engine = new JudgementEngine([tap(0, 2, 1000)]);
    expect(engine.update(1120)).toEqual([]);
    expect(engine.update(1121)).toEqual([{ noteId: 0, judgement: 'miss', timingErrorMs: 121 }]);
    expect(engine.update(2000)).toEqual([]);
  });

  it('tracks hold start and fails a release more than 120ms early', () => {
    const engine = new JudgementEngine([hold(0, 1, 1000, 2000)]);
    expect(engine.press(1, 1020)).toEqual([]);
    expect(engine.release(1, 1800)).toEqual([{ noteId: 0, judgement: 'miss', timingErrorMs: -200 }]);
  });

  it('keeps the hold-start judgement when released near the end or held through it', () => {
    const nearEnd = new JudgementEngine([hold(0, 1, 1000, 2000)]);
    nearEnd.press(1, 1050);
    expect(nearEnd.release(1, 1900)).toEqual([{ noteId: 0, judgement: 'great', timingErrorMs: 50 }]);

    const held = new JudgementEngine([hold(1, 3, 1000, 2000)]);
    held.press(3, 1080);
    expect(held.update(2000)).toEqual([{ noteId: 1, judgement: 'good', timingErrorMs: 80 }]);
  });
});
