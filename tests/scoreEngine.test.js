import { describe, expect, it } from 'vitest';

import { applyJudgement, createScoreState } from '../src/judgement/scoreEngine.js';

describe('score engine', () => {
  it('marks scores with ruleset version 2 after widening Perfect timing', () => {
    expect(createScoreState(1).rulesetVersion).toBe(2);
  });

  it('normalizes a full-perfect result to 1,000,000', () => {
    let state = createScoreState(4);
    for (let index = 0; index < 4; index += 1) state = applyJudgement(state, 'perfect');

    expect(state).toMatchObject({ score: 1_000_000, accuracy: 1, combo: 4, maxCombo: 4, hp: 100 });
  });

  it('uses versioned weights and resets combo on Miss', () => {
    let state = createScoreState(4);
    state = applyJudgement(state, 'perfect');
    state = applyJudgement(state, 'great');
    state = applyJudgement(state, 'good');
    state = applyJudgement(state, 'miss');

    expect(state.judgements).toEqual({ perfect: 1, great: 1, good: 1, miss: 1 });
    expect(state.accuracy).toBeCloseTo(0.575);
    expect(state.combo).toBe(0);
    expect(state.maxCombo).toBe(3);
    expect(state.hp).toBe(94);
    expect(state.score).toBe(592_500);
  });

  it('latches failure at zero HP without preventing later scoring', () => {
    let state = createScoreState(20);
    for (let index = 0; index < 17; index += 1) state = applyJudgement(state, 'miss');
    expect(state.hp).toBe(0);
    expect(state.failed).toBe(true);

    state = applyJudgement(state, 'perfect');
    expect(state.hp).toBe(1);
    expect(state.failed).toBe(true);
    expect(state.combo).toBe(1);
  });
});
