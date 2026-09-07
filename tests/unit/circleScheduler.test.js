// @ts-check

import { describe, expect, it } from 'vitest';
import { CircleScheduler } from '../../src/engine/circleScheduler.js';

/** @param {number} id @param {number} startTimeMs */
function makeCircle(id, startTimeMs) {
  return { id, kind: 'circle', startTimeMs, position: { x: 256, y: 192 }, radius: 40 };
}

describe('CircleScheduler', () => {
  it('processes every elapsed miss across a dropped frame exactly once', () => {
    const scheduler = new CircleScheduler([makeCircle(1, 1000), makeCircle(2, 1100)], { hit300: 38, hit100: 84, hit50: 130 });
    expect(scheduler.advance(900, 1301)).toEqual([
      { type: 'circle-judged', objectId: 1, judgement: 'miss', hitErrorMs: null },
      { type: 'circle-judged', objectId: 2, judgement: 'miss', hitErrorMs: null },
    ]);
    expect(scheduler.advance(1301, 1400)).toEqual([]);
  });

  it('consumes one press for at most one circle', () => {
    const scheduler = new CircleScheduler([makeCircle(1, 1000), makeCircle(2, 1000)], { hit300: 38, hit100: 84, hit50: 130 });
    expect(scheduler.press({ mapTimeMs: 1000, playfieldPosition: { x: 256, y: 192 } })).toMatchObject({ objectId: 1, judgement: '300' });
    expect(scheduler.unresolvedCount).toBe(1);
  });

  it('does not pass a blocked press through to a later overlapping circle', () => {
    const scheduler = new CircleScheduler([
      { ...makeCircle(1, 1000), position: { x: 0, y: 0 } },
      makeCircle(2, 1050),
    ], { hit300: 38, hit100: 84, hit50: 130 });
    expect(scheduler.press({ mapTimeMs: 1050, playfieldPosition: { x: 256, y: 192 } })).toBeNull();
    expect(scheduler.unresolvedCount).toBe(2);
  });
});
