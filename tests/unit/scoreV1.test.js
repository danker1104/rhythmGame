import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateDifficultyMultiplier, calculateObjectScore, resultRank } from '../../src/rules/scoreV1.js';
import fixture from '../fixtures/rules/score-v1-sequence.json';

describe('ScoreV1 rules', () => {
  it('matches the versioned Hard score sequence fixture', () => {
    expect(fixture.rulesetVersion).toBe(4);
    expect(fixture.mapSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(calculateDifficultyMultiplier(fixture.difficulty)).toBe(fixture.difficultyMultiplier);
    let total = 0;
    for (const event of fixture.events) {
      const addition = calculateObjectScore(event.hitValue, event.comboBeforeHit, fixture.difficultyMultiplier);
      expect(addition).toBe(event.addition);
      total += addition;
      expect(total).toBe(event.total);
    }
    expect(calculateAccuracy(fixture.counts)).toBeCloseTo(fixture.accuracy, 12);
    expect(resultRank(fixture.counts)).toBe(fixture.rank);
  });
  it('rounds difficulty once and floors the final positive object score', () => {
    expect(calculateDifficultyMultiplier({ hp: 5.2, cs: 3.8, od: 7.2, objectCount: 386, drainTimeSeconds: 126 })).toBe(4);
    expect(calculateObjectScore(300, 11, 4)).toBe(780);
  });

  it('does not apply a combo bonus before the second prior combo', () => {
    expect(calculateObjectScore(300, 0, 5)).toBe(300);
    expect(calculateObjectScore(300, 1, 5)).toBe(300);
    expect(calculateObjectScore(300, 2, 5)).toBe(360);
  });

  it('calculates accuracy from object judgements only', () => {
    expect(calculateAccuracy({ 300: 2, 100: 1, 50: 1, miss: 0 })).toBeCloseTo(0.625);
    expect(calculateAccuracy({ 300: 0, 100: 0, 50: 0, miss: 0 })).toBe(0);
  });

  it('honours strict and inclusive rank boundaries', () => {
    expect(resultRank({ 300: 100, 100: 0, 50: 0, miss: 0 })).toBe('SS');
    expect(resultRank({ 300: 91, 100: 8, 50: 1, miss: 0 })).toBe('S');
    expect(resultRank({ 300: 90, 100: 9, 50: 1, miss: 0 })).toBe('A');
    expect(resultRank({ 300: 60, 100: 40, 50: 0, miss: 0 })).toBe('D');
  });

  it('locks every 300-ratio and 50-ratio rank boundary', () => {
    expect(resultRank({ 300: 91, 100: 9, 50: 0, miss: 0 })).toBe('S');
    expect(resultRank({ 300: 91, 100: 8, 50: 1, miss: 0 })).toBe('S');
    expect(resultRank({ 300: 91, 100: 7, 50: 2, miss: 0 })).toBe('A');
    expect(resultRank({ 300: 90, 100: 10, 50: 0, miss: 0 })).toBe('A');
    expect(resultRank({ 300: 80, 100: 20, 50: 0, miss: 0 })).toBe('B');
    expect(resultRank({ 300: 70, 100: 30, 50: 0, miss: 0 })).toBe('C');
    expect(resultRank({ 300: 60, 100: 40, 50: 0, miss: 0 })).toBe('D');
    expect(resultRank({ 300: 91, 100: 0, 50: 0, miss: 9 })).toBe('A');
    expect(resultRank({ 300: 81, 100: 0, 50: 0, miss: 19 })).toBe('B');
    expect(resultRank({ 300: 61, 100: 0, 50: 0, miss: 39 })).toBe('C');
  });
});
