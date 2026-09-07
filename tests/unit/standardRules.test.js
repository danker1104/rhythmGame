// @ts-check

import { describe, expect, it } from 'vitest';
import {
  approachRateToPreempt,
  circleSizeToRadius,
  getHitWindows,
  getRank,
} from '../../src/rules/standardRules.js';

describe('standard difficulty formulas', () => {
  it.each([
    [3, 1440],
    [5, 1200],
    [6, 1050],
    [8.3, 705],
    [9, 600],
  ])('converts AR %s to %sms preempt', (approachRate, expected) => {
    expect(approachRateToPreempt(approachRate)).toBeCloseTo(expected, 10);
  });

  it.each([
    [3, 40.96],
    [3.2, 40.064],
    [3.3, 39.616],
    [3.8, 37.376],
    [4, 36.48],
  ])('converts CS %s to radius %s', (circleSize, expected) => {
    expect(circleSizeToRadius(circleSize)).toBeCloseTo(expected, 10);
  });

  it('calculates OD windows without rounding away fractional boundaries', () => {
    expect(getHitWindows(7.2)).toEqual({ hit300: 36.8, hit100: 82.4, hit50: 128 });
  });
});

describe('standard result rank', () => {
  it('returns SS only for one hundred percent accuracy', () => {
    expect(getRank({ hit300: 100, hit100: 0, hit50: 0, miss: 0 })).toBe('SS');
  });

  it('keeps the S thresholds strict for 300s and inclusive for 50s', () => {
    expect(getRank({ hit300: 91, hit100: 8, hit50: 1, miss: 0 })).toBe('S');
    expect(getRank({ hit300: 90, hit100: 9, hit50: 1, miss: 0 })).toBe('A');
  });

  it('returns D when there are no completed objects', () => {
    expect(getRank({ hit300: 0, hit100: 0, hit50: 0, miss: 0 })).toBe('D');
  });
});
