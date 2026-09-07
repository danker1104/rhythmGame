// @ts-check

import { describe, expect, it } from 'vitest';
import { animationFramePath, evaluateCommands, evaluateStoryboardObject } from '../../src/storyboard/storyboardTimeline.js';

describe('Storyboard timeline', () => {
  it('uses the later declared property command after its start, including overlaps', () => {
    const commands = [
      { type: 'F', easing: 0, startTimeMs: 0, endTimeMs: 100, startValue: 0, endValue: 1, order: 0 },
      { type: 'F', easing: 0, startTimeMs: 50, endTimeMs: 75, startValue: 0.2, endValue: 0.4, order: 1 },
      { type: 'F', easing: 0, startTimeMs: 50, endTimeMs: 50, startValue: 0.8, endValue: 0.8, order: 2 },
    ];
    expect(evaluateCommands(commands, 25, 1)).toBeCloseTo(0.25);
    expect(evaluateCommands(commands, 50, 1)).toBeCloseTo(0.8);
    expect(evaluateCommands(commands, 90, 1)).toBeCloseTo(0.8);
  });

  it('evaluates F, M and S from the same map time', () => {
    const object = { startTimeMs: 0, endTimeMs: 100, position: { x: 10, y: 20 }, commands: [
      { type: 'F', easing: 0, startTimeMs: 0, endTimeMs: 100, startValue: 0, endValue: 1, order: 0 },
      { type: 'M', easing: 0, startTimeMs: 0, endTimeMs: 100, startValue: [10, 20], endValue: [30, 40], order: 1 },
      { type: 'S', easing: 0, startTimeMs: 0, endTimeMs: 100, startValue: 1, endValue: 2, order: 2 },
    ] };
    expect(evaluateStoryboardObject(object, 50)).toMatchObject({ opacity: 0.5, position: { x: 20, y: 30 }, scale: { x: 1.5, y: 1.5 } });
  });

  it('selects LoopForever animation frames from map time rather than RAF count', () => {
    expect(animationFramePath('SB/idle.png', 43, 25, true, 1000, 1000)).toBe('SB/idle0.png');
    expect(animationFramePath('SB/idle.png', 43, 25, true, 1000, 2075)).toBe('SB/idle0.png');
    expect(animationFramePath('SB/idle.png', 43, 25, true, 1000, 2025)).toBe('SB/idle41.png');
  });
});
