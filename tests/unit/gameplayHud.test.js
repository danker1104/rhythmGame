// @ts-check

import { describe, expect, it } from 'vitest';
import { gameplayHudLayout, hudAccuracy, readyPrompt, scoreGlyphs } from '../../src/renderer/gameplayHud.js';

describe('gameplay skin HUD', () => {
  it('anchors score, HP, combo, accuracy, and input overlay to a responsive Canvas', () => {
    expect(gameplayHudLayout(1024, 768)).toEqual({
      score: { x: 1000, y: 24, align: 'right' }, hp: { x: 24, y: 24, width: 360 },
      accuracy: { x: 512, y: 24, align: 'center' }, judgements: { x: 24, y: 96 },
      combo: { x: 24, y: 704 }, input: { x: 928, y: 328 },
      timing: { x: 362, y: 738, width: 300, centerX: 512 },
    });
  });

  it('keeps the reference timing bar centered and above the bottom edge at 1280x720', () => {
    expect(gameplayHudLayout(1280, 720).timing).toEqual({ x: 490, y: 690, width: 300, centerX: 640 });
  });

  it('maps formatted HUD values to skin score glyph names', () => {
    expect(scoreGlyphs('0012.34%')).toEqual([
      'score-0.png', 'score-0.png', 'score-1.png', 'score-2.png',
      'score-dot.png', 'score-3.png', 'score-4.png', 'score-percent.png',
    ]);
  });

  it('shows full accuracy before the first completed judgement', () => {
    expect(hudAccuracy(0, { 300: 0, 100: 0, 50: 0, miss: 0 })).toBe(1);
    expect(hudAccuracy(0.875, { 300: 7, 100: 1, 50: 0, miss: 0 })).toBe(0.875);
  });

  it('shows the accepted DANSER prompt only during the opening lead-in', () => {
    expect(readyPrompt(0, 7_984)).toBe('DANSER');
    expect(readyPrompt(1_799, 7_984)).toBe('DANSER');
    expect(readyPrompt(1_800, 7_984)).toBeNull();
    expect(readyPrompt(0, 1_000)).toBeNull();
  });
});
