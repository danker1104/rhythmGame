// @ts-check

import { describe, expect, it } from 'vitest';
import { SpinnerRuntime, requiredSpinnerSpins } from '../../src/rules/spinnerJudge.js';
import fixture from '../fixtures/rules/spinner-boundaries.json';

describe('Spinner rules', () => {
  it('matches all five map OD fixtures and judgement boundaries', () => {
    expect(fixture.rulesetVersion).toBe(4);
    /** @type {Record<string, string>} */
    const mapHashes = fixture.mapSha256ByBeatmapId;
    for (const item of fixture.requiredCases) {
      expect(mapHashes[String(item.beatmapId)]).toMatch(/^[0-9a-f]{64}$/);
      expect(requiredSpinnerSpins(item.od, fixture.durationMs)).toBe(item.requiredSpins);
    }
    for (const item of fixture.judgementCases) {
      const spinner = new SpinnerRuntime({ id: 1, startTimeMs: 0, endTimeMs: 2000, requiredSpins: 7 });
      spinner.rotationRadians = item.completedSpins * Math.PI * 2;
      expect(spinner.finish()).toMatchObject({ judgement: item.expected, bonusSpins: item.bonusSpins });
    }
  });
  it('quantizes the documented OD and duration formula to full spins', () => {
    expect(requiredSpinnerSpins(2, 2000)).toBe(4);
    expect(requiredSpinnerSpins(8.2, 2000)).toBe(7);
  });

  it('ignores movement while released and filters center and oversized deltas', () => {
    const spinner = new SpinnerRuntime({ id: 1, startTimeMs: 0, endTimeMs: 2000, requiredSpins: 1 });
    spinner.sample({ x: 356, y: 192 }, false);
    spinner.sample({ x: 256, y: 292 }, false);
    spinner.sample({ x: 256, y: 192 }, true);
    spinner.sample({ x: 356, y: 192 }, true);
    expect(spinner.rotationRadians).toBe(0);
  });

  it('accepts either direction and returns 300 at the requirement', () => {
    const spinner = new SpinnerRuntime({ id: 1, startTimeMs: 0, endTimeMs: 2000, requiredSpins: 1 });
    const points = [{x:356,y:192},{x:256,y:292},{x:156,y:192},{x:256,y:92},{x:356,y:192}];
    for (const point of points) spinner.sample(point, true);
    expect(spinner.finish()).toMatchObject({ judgement: '300', completedSpins: 1 });
  });
});
