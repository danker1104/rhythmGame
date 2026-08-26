export const RULESET_VERSION = 2;

export const JUDGEMENT_WINDOWS_MS = Object.freeze({
  perfect: 45,
  great: 70,
  good: 120,
});

export const JUDGEMENT_WEIGHTS = Object.freeze({
  perfect: 1,
  great: 0.8,
  good: 0.5,
  miss: 0,
});

export const HP_CHANGES = Object.freeze({
  perfect: 1,
  great: 0.5,
  good: 0,
  miss: -6,
});

export const DEFAULT_KEY_BINDINGS = Object.freeze(['KeyD', 'KeyF', 'KeyJ', 'KeyK']);
