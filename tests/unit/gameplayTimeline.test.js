// @ts-check

import { describe, expect, it } from 'vitest';
import { GameplayState } from '../../src/rules/gameplayState.js';

describe('GameplayState chronological frame processing', () => {
  it('applies an early hit before draining the rest of a dropped frame', () => {
    const state = new GameplayState({ difficultyMultiplier: 1, hpDrainRate: 5, initialHealth: 0.02 });

    const applied = state.processFrame({
      previousTimeMs: 0,
      currentTimeMs: 1000,
      drainStartTimeMs: 0,
      drainEndTimeMs: 1000,
      breaks: [],
      events: [{ type: 'circle-judged', objectId: 1, judgement: '300', mapTimeMs: 100 }],
    });

    expect(applied).toHaveLength(1);
    expect(state.failed).toBe(false);
    expect(state.health.value).toBeCloseTo(0.06, 10);
    expect(state.score).toBe(300);
  });

  it('stops applying later same-frame events after failure is latched', () => {
    const state = new GameplayState({ difficultyMultiplier: 1, hpDrainRate: 5, initialHealth: 0.1 });

    const applied = state.processFrame({
      previousTimeMs: 0,
      currentTimeMs: 300,
      drainStartTimeMs: 0,
      drainEndTimeMs: 300,
      breaks: [],
      events: [
        { type: 'circle-judged', objectId: 2, judgement: '300', mapTimeMs: 200 },
        { type: 'circle-judged', objectId: 1, judgement: 'miss', mapTimeMs: 100 },
      ],
    });

    expect(applied.map((event) => event.objectId)).toEqual([1]);
    expect(state.failed).toBe(true);
    expect(state.score).toBe(0);
    expect(state.judgements).toEqual({ 300: 0, 100: 0, 50: 0, miss: 1 });
  });

  it('preserves scheduler order for events sharing one map timestamp', () => {
    const state = new GameplayState({ difficultyMultiplier: 1, hpDrainRate: 5 });
    const events = [
      { type: 'slider-part', objectId: 3, kind: 'tail', result: 'hit', comboBreak: false, mapTimeMs: 500 },
      { type: 'slider-judged', objectId: 3, judgement: '300', mapTimeMs: 500 },
    ];

    expect(state.processFrame({
      previousTimeMs: 400,
      currentTimeMs: 600,
      drainStartTimeMs: 400,
      drainEndTimeMs: 600,
      breaks: [],
      events,
    })).toEqual(events);
    expect(state.combo).toBe(1);
    expect(state.score).toBe(330);
  });
});
