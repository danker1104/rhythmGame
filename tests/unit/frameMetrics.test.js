// @ts-check

import { describe, expect, it } from 'vitest';
import { FrameMetrics } from '../../src/performance/frameMetrics.js';

describe('FrameMetrics', () => {
  it('reports average FPS, p95 and long-frame ratio over a bounded window', () => {
    const metrics = new FrameMetrics(5);
    for (const duration of [10, 16, 20, 34, 50, 12]) metrics.record(duration);
    expect(metrics.snapshot()).toEqual({ sampleCount: 5, averageFps: 37.88, p95FrameMs: 50, over33Ratio: 0.4 });
  });

  it('evaluates the documented frame budget without rounding the decision values', () => {
    const passing = new FrameMetrics();
    for (let index = 0; index < 120; index += 1) passing.record(1000 / 60);
    expect(passing.meetsBudget()).toBe(true);
    const failing = new FrameMetrics();
    for (let index = 0; index < 99; index += 1) failing.record(16);
    failing.record(34);
    expect(failing.meetsBudget()).toBe(false);
  });
});
