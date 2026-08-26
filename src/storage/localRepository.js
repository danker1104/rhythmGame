import { DEFAULT_KEY_BINDINGS } from '../config/gameConfig.js';

const SETTINGS_KEY = 'rhythm-game:v1:settings';
const RESULTS_KEY = 'rhythm-game:v1:best-results';
const DIFFICULTIES = new Set(['easy', 'normal', 'hard', 'insane']);

export const DEFAULT_SETTINGS = Object.freeze({
  keyBindings: Object.freeze([...DEFAULT_KEY_BINDINGS]),
  scrollSpeed: 1,
  offsetMs: 0,
  masterVolume: 1,
  effectVolume: 0.8,
  musicMuted: false,
  effectsMuted: false,
  lastDifficultyId: 'easy',
});

function cloneDefaults() {
  return { ...DEFAULT_SETTINGS, keyBindings: [...DEFAULT_SETTINGS.keyBindings] };
}

function validSettings(value) {
  return value &&
    Array.isArray(value.keyBindings) && value.keyBindings.length === 4 &&
    value.keyBindings.every((code) => typeof code === 'string' && code.length > 0) &&
    new Set(value.keyBindings).size === 4 &&
    Number.isFinite(value.scrollSpeed) && value.scrollSpeed >= 0.5 && value.scrollSpeed <= 2 &&
    Number.isFinite(value.offsetMs) && value.offsetMs >= -300 && value.offsetMs <= 300 &&
    Number.isFinite(value.masterVolume) && value.masterVolume >= 0 && value.masterVolume <= 1 &&
    Number.isFinite(value.effectVolume) && value.effectVolume >= 0 && value.effectVolume <= 1 &&
    typeof value.musicMuted === 'boolean' && typeof value.effectsMuted === 'boolean' &&
    DIFFICULTIES.has(value.lastDifficultyId);
}

function isBetter(next, current) {
  if (!current) return true;
  return next.score > current.score ||
    (next.score === current.score && next.accuracy > current.accuracy) ||
    (next.score === current.score && next.accuracy === current.accuracy && next.maxCombo > current.maxCombo);
}

export function createLocalRepository(storage = globalThis.localStorage) {
  const memory = new Map();
  const read = (key) => {
    try { return storage?.getItem(key) ?? memory.get(key) ?? null; }
    catch { return memory.get(key) ?? null; }
  };
  const write = (key, value) => {
    memory.set(key, value);
    try { storage?.setItem(key, value); } catch { /* memory fallback */ }
  };

  return {
    loadSettings() {
      try {
        const value = JSON.parse(read(SETTINGS_KEY));
        return validSettings(value) ? { ...value, keyBindings: [...value.keyBindings] } : cloneDefaults();
      } catch {
        return cloneDefaults();
      }
    },
    saveSettings(settings) {
      const normalized = validSettings(settings) ? settings : cloneDefaults();
      write(SETTINGS_KEY, JSON.stringify(normalized));
      return { ...normalized, keyBindings: [...normalized.keyBindings] };
    },
    getBestResult(difficultyId) {
      try { return JSON.parse(read(RESULTS_KEY) ?? '{}')[difficultyId] ?? null; }
      catch { return null; }
    },
    saveBestResult(result) {
      let results;
      try { results = JSON.parse(read(RESULTS_KEY) ?? '{}'); } catch { results = {}; }
      if (!isBetter(result, results[result.difficultyId])) return false;
      results[result.difficultyId] = result;
      write(RESULTS_KEY, JSON.stringify(results));
      return true;
    },
  };
}

