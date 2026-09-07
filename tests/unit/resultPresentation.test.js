// @ts-check

import { describe, expect, it } from 'vitest';
import { buildResultPresentation } from '../../src/ui/resultPresentation.js';

describe('result presentation', () => {
  it('formats the authoritative result without changing its values', () => {
    expect(buildResultPresentation({
      score: 1234567, accuracy: 0.9876, maxCombo: 321,
      judgements: { 300: 300, 100: 10, 50: 2, miss: 1 },
      sliderBreaks: 3, spinnerBonus: 400, rank: 'A', cleared: true,
    }, true)).toEqual({
      title: 'RESULT', rank: 'A', score: '1,234,567', accuracy: '98.76%', maxCombo: '321x',
      judgements: { 300: '300', 100: '10', 50: '2', miss: '1' },
      sliderBreaks: '3', spinnerBonus: '400', recordLabel: 'NEW RECORD', cleared: true,
    });
  });

  it('labels failed retained results without inventing a next-song action', () => {
    const view = buildResultPresentation({
      score: 10, accuracy: 0.5, maxCombo: 2, judgements: { 300: 1, 100: 1, 50: 0, miss: 1 },
      sliderBreaks: 0, spinnerBonus: 0, rank: 'D', cleared: false,
    }, false);
    expect(view).toMatchObject({ title: 'PLAY FAILED', recordLabel: 'BEST RETAINED', cleared: false });
    expect(view).not.toHaveProperty('nextSong');
  });
});
