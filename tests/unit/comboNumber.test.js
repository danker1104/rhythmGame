// @ts-check

import { describe, expect, it } from 'vitest';
import { layoutComboDigits, sliderHeadShowsCombo } from '../../src/renderer/comboNumber.js';

describe('combo number rendering', () => {
  it('centers every digit of multi-digit combo numbers', () => {
    expect(layoutComboDigits(12, 40)).toEqual([
      { digit: 1, x: -20, width: 20, height: 28 },
      { digit: 2, x: 0, width: 20, height: 28 },
    ]);
  });

  it('applies the skin.ini hit-circle digit overlap while keeping the number centered', () => {
    expect(layoutComboDigits(12, 40, 4)).toEqual([
      { digit: 1, x: -18.75, width: 20, height: 28 },
      { digit: 2, x: -1.25, width: 20, height: 28 },
    ]);
  });

  it('shows a slider combo number until its head is resolved', () => {
    expect(sliderHeadShowsCombo({ parts: [{ kind: 'head', result: null }] })).toBe(true);
    expect(sliderHeadShowsCombo({ parts: [{ kind: 'head', result: 'hit' }] })).toBe(false);
  });
});
