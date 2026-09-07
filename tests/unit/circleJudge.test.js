// @ts-check

import { describe, expect, it } from 'vitest';
import { judgeCirclePress, selectNotelockedCandidate } from '../../src/rules/circleJudge.js';
import fixture from '../fixtures/rules/circle-boundaries.json';

const circle = { id: 1, startTimeMs: 1000, position: { x: 256, y: 192 }, radius: 40 };
const windows = { hit300: 38, hit100: 84, hit50: 130 };

describe('Circle judgement', () => {
  it('matches the versioned Hard boundary fixture', () => {
    expect(fixture.rulesetVersion).toBe(4);
    expect(fixture.mapSha256).toMatch(/^[0-9a-f]{64}$/);
    const boundaryCircle = { ...circle, startTimeMs: 0 };
    for (const item of fixture.cases) {
      expect(judgeCirclePress(boundaryCircle, {
        mapTimeMs: item.errorMs,
        playfieldPosition: boundaryCircle.position,
      }, fixture.windows)).toBe(item.expected);
    }
  });
  it.each([
    [1038, '300'],
    [1038.001, '100'],
    [1084, '100'],
    [1084.001, '50'],
    [1130, '50'],
    [1130.001, null],
  ])('judges time %sms as %s', (mapTimeMs, expected) => {
    expect(judgeCirclePress(circle, { mapTimeMs, playfieldPosition: { x: 256, y: 192 } }, windows)).toBe(expected);
  });

  it('requires the cursor to be inside the same radius used for rendering', () => {
    expect(judgeCirclePress(circle, { mapTimeMs: 1000, playfieldPosition: { x: 296, y: 192 } }, windows)).toBe('300');
    expect(judgeCirclePress(circle, { mapTimeMs: 1000, playfieldPosition: { x: 296.001, y: 192 } }, windows)).toBeNull();
  });
});

describe('Circle notelock candidate selection', () => {
  it('returns only the earliest unresolved object inside its 50 window', () => {
    const objects = [
      { ...circle, id: 1, startTimeMs: 1000, resolved: false },
      { ...circle, id: 2, startTimeMs: 1050, resolved: false },
    ];
    expect(selectNotelockedCandidate(objects, 1060, 130)?.id).toBe(1);
  });

  it('skips resolved objects', () => {
    const objects = [
      { ...circle, id: 1, startTimeMs: 1000, resolved: true },
      { ...circle, id: 2, startTimeMs: 1050, resolved: false },
    ];
    expect(selectNotelockedCandidate(objects, 1060, 130)?.id).toBe(2);
  });
});
