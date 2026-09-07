// @ts-check

import { describe, expect, it } from 'vitest';
import { calculateCircleVisualState, createCircleDrawCommands } from '../../src/renderer/circleRenderer.js';

describe('Circle visual timing', () => {
  const circle = { id: 1, startTimeMs: 2000, position: { x: 256, y: 192 }, radius: 40, comboNumber: 1 };

  it('fades in over exactly preempt × 2/3 and stays opaque at hit time', () => {
    expect(calculateCircleVisualState(circle, 800, 1200).opacity).toBe(0);
    expect(calculateCircleVisualState(circle, 1600, 1200).opacity).toBe(1);
    expect(calculateCircleVisualState(circle, 2000, 1200).opacity).toBe(1);
  });

  it('derives approach scale from map time without frame accumulation', () => {
    expect(calculateCircleVisualState(circle, 800, 1200).approachScale).toBe(4);
    expect(calculateCircleVisualState(circle, 2000, 1200).approachScale).toBe(1);
  });

  it('creates ordered approach, base, overlay, and number commands', () => {
    const commands = createCircleDrawCommands({ ...circle, comboColour: [47, 67, 212] }, 1600, 1200);
    expect(commands.map((command) => command.type)).toEqual([
      'approach-circle', 'hit-circle', 'hit-circle-overlay', 'combo-number',
    ]);
    expect(commands.every((command) => command.comboColour.join(',') === '47,67,212')).toBe(true);
  });
});
