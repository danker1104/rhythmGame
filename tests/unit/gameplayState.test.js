import { describe, expect, it } from 'vitest';
import { GameplayState } from '../../src/rules/gameplayState.js';

describe('GameplayState', () => {
  it('applies circle, slider part/final, and spinner score without double-counting combo', () => {
    const state = new GameplayState({ difficultyMultiplier: 4, hpDrainRate: 5 });
    state.apply({ type: 'circle-judged', judgement: '300' });
    state.apply({ type: 'slider-part', kind: 'head', result: 'hit', comboBreak: false });
    state.apply({ type: 'slider-part', kind: 'tick', result: 'hit', comboBreak: false });
    state.apply({ type: 'slider-judged', judgement: '100' });
    state.apply({ type: 'spinner-judged', judgement: '300', completedSpins: 5, requiredSpins: 4, bonusSpins: 1 });

    expect(state.combo).toBe(3);
    expect(state.maxCombo).toBe(3);
    expect(state.judgements).toEqual({ 300: 2, 100: 1, 50: 0, miss: 0 });
    expect(state.score).toBe(300 + 30 + 10 + 132 + 396 + 4 * 100 + 1100);
    expect(state.spinnerBonus).toBe(1);
  });

  it('breaks combo on a slider head miss but not a tail miss', () => {
    const state = new GameplayState({ difficultyMultiplier: 1, hpDrainRate: 5 });
    state.apply({ type: 'circle-judged', judgement: '300' });
    state.apply({ type: 'slider-part', kind: 'head', result: 'miss', comboBreak: true });
    expect(state.combo).toBe(0);
    expect(state.sliderBreaks).toBe(1);
    state.apply({ type: 'slider-part', kind: 'tail', result: 'miss', comboBreak: false });
    expect(state.sliderBreaks).toBe(1);
  });
});
