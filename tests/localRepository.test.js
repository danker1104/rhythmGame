// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { createLocalRepository, DEFAULT_SETTINGS } from '../src/storage/localRepository.js';

describe('local repository', () => {
  beforeEach(() => localStorage.clear());

  it('recovers corrupt and invalid settings with defaults', () => {
    localStorage.setItem('rhythm-game:v1:settings', '{broken');
    const repository = createLocalRepository(localStorage);
    expect(repository.loadSettings()).toEqual(DEFAULT_SETTINGS);

    localStorage.setItem('rhythm-game:v1:settings', JSON.stringify({
      ...DEFAULT_SETTINGS,
      keyBindings: ['KeyD', 'KeyD', 'KeyJ', 'KeyK'],
      masterVolume: 3,
    }));
    expect(repository.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('stores valid settings and difficulty-specific best results', () => {
    const repository = createLocalRepository(localStorage);
    const settings = { ...DEFAULT_SETTINGS, scrollSpeed: 1.25, offsetMs: -20, lastDifficultyId: 'hard' };
    repository.saveSettings(settings);
    expect(repository.loadSettings()).toEqual(settings);

    const first = { difficultyId: 'hard', score: 500000, accuracy: 0.9, maxCombo: 100 };
    const lower = { difficultyId: 'hard', score: 400000, accuracy: 1, maxCombo: 200 };
    expect(repository.saveBestResult(first)).toBe(true);
    expect(repository.saveBestResult(lower)).toBe(false);
    expect(repository.getBestResult('hard')).toMatchObject(first);
  });

  it('breaks tied scores by accuracy and then maximum combo', () => {
    const repository = createLocalRepository(localStorage);
    repository.saveBestResult({ difficultyId: 'easy', score: 900000, accuracy: 0.95, maxCombo: 300 });
    expect(repository.saveBestResult({ difficultyId: 'easy', score: 900000, accuracy: 0.96, maxCombo: 200 })).toBe(true);
    expect(repository.saveBestResult({ difficultyId: 'easy', score: 900000, accuracy: 0.96, maxCombo: 301 })).toBe(true);
  });
});
