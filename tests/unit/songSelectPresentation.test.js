// @ts-check

import { describe, expect, it } from 'vitest';
import { buildDifficultyItems, carouselOffset, moveDifficultySelection, previewLabel } from '../../src/ui/songSelectPresentation.js';

describe('song select presentation', () => {
  const song = {
    difficulties: [
      { id: 'easy', label: 'Easy', beatmapId: 1 },
      { id: 'hard', label: 'Hard', beatmapId: 2 },
      { id: 'insane', label: 'Insane', beatmapId: 3 },
    ],
  };
  const models = new Map([
    ['easy', { hpDrainRate: 2, circleSize: 3, overallDifficulty: 2, approachRate: 3, statistics: { circles: 10, sliders: 20, spinners: 1, total: 31 } }],
    ['hard', { hpDrainRate: 5, circleSize: 4, overallDifficulty: 7, approachRate: 8, statistics: { circles: 30, sliders: 40, spinners: 2, total: 72 } }],
  ]);

  it('builds catalog-ordered difficulty cards with selected and loading states', () => {
    expect(buildDifficultyItems(song, models, 'hard')).toEqual([
      expect.objectContaining({ id: 'easy', label: 'Easy', beatmapId: 1, selected: false, ready: true, total: 31 }),
      expect.objectContaining({ id: 'hard', label: 'Hard', beatmapId: 2, selected: true, ready: true, total: 72 }),
      expect.objectContaining({ id: 'insane', label: 'Insane', beatmapId: 3, selected: false, ready: false, total: null }),
    ]);
  });

  it('wraps keyboard carousel selection in both directions', () => {
    expect(moveDifficultySelection(song.difficulties, 'easy', -1)).toBe('insane');
    expect(moveDifficultySelection(song.difficulties, 'insane', 1)).toBe('easy');
    expect(moveDifficultySelection(song.difficulties, 'hard', 1)).toBe('insane');
  });

  it('exposes explicit preview play and stop labels', () => {
    expect(previewLabel(false)).toBe('미리듣기');
    expect(previewLabel(true)).toBe('미리듣기 중지');
  });

  it('places every difficulty on the shortest wrapped arc around selection', () => {
    expect(song.difficulties.map((item) => carouselOffset(song.difficulties, 'easy', item.id))).toEqual([0, 1, -1]);
    expect(song.difficulties.map((item) => carouselOffset(song.difficulties, 'hard', item.id))).toEqual([-1, 0, 1]);
  });
});
