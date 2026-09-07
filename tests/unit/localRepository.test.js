// @ts-check

import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, LocalRepository } from '../../src/storage/localRepository.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (/** @type {string} */ key) => values.get(key) ?? null, setItem: (/** @type {string} */ key, /** @type {string} */ value) => values.set(key, value) };
}

describe('LocalRepository settings', () => {
  it('recovers malformed, out-of-range, NaN-like and duplicate binding values', () => {
    const storage = memoryStorage();
    storage.setItem('web-osu:v2:settings', JSON.stringify({ offsetMs: 9999, masterVolume: 'NaN', backgroundDim: 0.4, keyBindings: ['KeyZ', 'KeyZ'] }));
    expect(new LocalRepository(storage).loadSettings()).toEqual({ ...DEFAULT_SETTINGS, backgroundDim: 0.4 });
  });

  it('continues in memory when storage access throws', () => {
    const repository = new LocalRepository({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
    const settings = { ...DEFAULT_SETTINGS, offsetMs: 25 };
    repository.saveSettings(settings);
    expect(repository.loadSettings().offsetMs).toBe(25);
  });

  it('normalizes persisted HUD and diagnostics visibility toggles', () => {
    const storage = memoryStorage();
    storage.setItem('web-osu:v2:settings', JSON.stringify({ hudDetailEnabled: false, inputOverlayEnabled: false, fpsEnabled: true }));
    expect(new LocalRepository(storage).loadSettings()).toMatchObject({ hudDetailEnabled: false, inputOverlayEnabled: false, fpsEnabled: true });
  });
});

describe('LocalRepository best results', () => {
  it('compares score, accuracy, max combo, then earliest achieved time', () => {
    const repository = new LocalRepository(memoryStorage());
    const base = { score: 1000, accuracy: 0.9, maxCombo: 10, playedAt: '2026-01-02T00:00:00.000Z' };
    expect(repository.saveBestResult('song:1:1', base).updated).toBe(true);
    expect(repository.saveBestResult('song:1:1', { ...base, accuracy: 0.8, score: 1001 }).updated).toBe(true);
    expect(repository.saveBestResult('song:1:1', { ...base, score: 1001, accuracy: 0.8, playedAt: '2026-01-03T00:00:00.000Z' }).updated).toBe(false);
    expect(repository.getBestResult('song:1:1')?.score).toBe(1001);
  });
});
