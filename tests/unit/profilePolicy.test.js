// @ts-check

import { describe, expect, it } from 'vitest';
import { sessionOutcome } from '../../src/performance/profilePolicy.js';

describe('sessionOutcome', () => {
  it('keeps normal gameplay failure behavior', () => {
    expect(sessionOutcome({ failed: true, currentTimeMs: 10, endTimeMs: 100, hitWindowMs: 20, profileMode: false })).toBe('failed');
  });

  it('keeps a debug profile running after HP reaches zero', () => {
    expect(sessionOutcome({ failed: true, currentTimeMs: 10, endTimeMs: 100, hitWindowMs: 20, profileMode: true })).toBe(null);
  });

  it('completes both normal and profile sessions after the map', () => {
    expect(sessionOutcome({ failed: false, currentTimeMs: 121, endTimeMs: 100, hitWindowMs: 20, profileMode: true })).toBe('cleared');
  });
});
