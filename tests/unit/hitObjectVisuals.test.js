// @ts-check

import { describe, expect, it } from 'vitest';
import {
  decorateHitObjects,
  followPointSprites,
  reverseArrowAngle,
} from '../../src/renderer/hitObjectVisuals.js';

describe('hit object skin visuals', () => {
  it('resets combo numbers and advances skin combo colours on new combos', () => {
    const objects = [
      { id: 0, kind: 'circle', isNewCombo: true, comboOffset: 0 },
      { id: 1, kind: 'slider', isNewCombo: false, comboOffset: 0 },
      { id: 2, kind: 'circle', isNewCombo: true, comboOffset: 1 },
      { id: 3, kind: 'circle', isNewCombo: false, comboOffset: 0 },
    ];
    const colours = [[47, 67, 212], [136, 102, 204], [255, 255, 255]];

    expect(decorateHitObjects(objects, colours).map(({ comboNumber, comboColour }) => ({ comboNumber, comboColour }))).toEqual([
      { comboNumber: 1, comboColour: [47, 67, 212] },
      { comboNumber: 2, comboColour: [47, 67, 212] },
      { comboNumber: 1, comboColour: [255, 255, 255] },
      { comboNumber: 2, comboColour: [255, 255, 255] },
    ]);
  });

  it('creates spaced follow points only within the same combo', () => {
    const objects = decorateHitObjects([
      { id: 0, kind: 'circle', startTimeMs: 1000, endTimeMs: 1000, position: { x: 100, y: 100 }, isNewCombo: true, comboOffset: 0 },
      { id: 1, kind: 'circle', startTimeMs: 1500, endTimeMs: 1500, position: { x: 300, y: 100 }, isNewCombo: false, comboOffset: 0 },
      { id: 2, kind: 'circle', startTimeMs: 2000, endTimeMs: 2000, position: { x: 400, y: 100 }, isNewCombo: true, comboOffset: 0 },
    ], [[1, 2, 3]]);

    const points = followPointSprites(objects, 1100, 800);

    expect(points.length).toBeGreaterThan(1);
    expect(points.every((point) => point.fromId === 0 && point.toId === 1)).toBe(true);
    expect(points[0].angle).toBe(0);
    expect(points.every((point) => point.frame >= 0 && point.frame < 3)).toBe(true);
  });

  it('orients a repeat arrow toward the next slider span', () => {
    const slider = { pathPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };

    expect(reverseArrowAngle(slider, { position: { x: 100, y: 0 } })).toBeCloseTo(Math.PI);
    expect(reverseArrowAngle(slider, { position: { x: 0, y: 0 } })).toBeCloseTo(0);
  });
});
