import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/rules/health-sequences.json';
import { HealthProcessor, passiveDrainPerSecond } from '../../src/rules/healthProcessor.js';

describe('HealthProcessor', () => {
  it.each(fixtures)('matches the HP $hp one-second fixture', (fixture) => {
    expect(fixture.rulesetVersion).toBe(4);
    expect(fixture.mapSha256).toMatch(/^[0-9a-f]{64}$/);
    const health = new HealthProcessor(fixture.hp, fixture.initial);
    health.advance(0, 1000, []);
    expect(health.value).toBeCloseTo(fixture.afterOneSecond, 10);
    const breakHealth = new HealthProcessor(fixture.hp, fixture.initial);
    breakHealth.advance(0, 2000, [{ startTimeMs: 500, endTimeMs: 1500 }]);
    expect(breakHealth.value).toBeCloseTo(fixture.afterBreakWindow, 10);
    health.applyJudgement('300');
    expect(health.value).toBeCloseTo(fixture.afterHit300, 10);
    const failingHealth = new HealthProcessor(fixture.hp, fixture.initial);
    for (let index = 0; index < fixture.missesToFail; index += 1) failingHealth.applyJudgement('miss');
    expect(failingHealth.failed).toBe(true);
  });

  it('does not drain during breaks and only drains uncovered time', () => {
    const health = new HealthProcessor(5, 0.5);
    health.advance(0, 2000, [{ startTimeMs: 500, endTimeMs: 1500 }]);
    expect(health.value).toBeCloseTo(0.5 - passiveDrainPerSecond(5));
  });

  it('fails immediately when a penalty reaches zero', () => {
    const health = new HealthProcessor(6, 0.1);
    health.applyJudgement('miss');
    expect(health.value).toBe(0);
    expect(health.failed).toBe(true);
  });

  it('latches failure so later same-frame gains cannot revive the play', () => {
    const health = new HealthProcessor(6, 0.1);
    health.applyJudgement('miss');
    health.applyJudgement('300');
    health.applySliderPart();
    health.applySpinnerBonus(3);

    expect(health.value).toBe(0);
    expect(health.failed).toBe(true);
  });
});
