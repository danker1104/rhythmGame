// @ts-check

import { describe, expect, it } from 'vitest';
import { LoadGeneration } from '../../src/app/loadGeneration.js';

describe('LoadGeneration', () => {
  it('aborts the previous request and rejects its stale token', () => {
    const loads = new LoadGeneration();
    const first = loads.begin();
    const second = loads.begin();

    expect(first.signal.aborted).toBe(true);
    expect(loads.isCurrent(first.id)).toBe(false);
    expect(loads.isCurrent(second.id)).toBe(true);
  });

  it('invalidates the active request when the selection changes', () => {
    const loads = new LoadGeneration();
    const active = loads.begin();

    loads.cancel();

    expect(active.signal.aborted).toBe(true);
    expect(loads.isCurrent(active.id)).toBe(false);
  });
});
