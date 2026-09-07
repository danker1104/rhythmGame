// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { FrameCoordinator } from '../../src/engine/frameCoordinator.js';

describe('FrameCoordinator', () => {
  it('reads map time once and passes the same value to update and render', () => {
    const clock = { getMapTimeMs: vi.fn(() => 1234) };
    const advance = vi.fn();
    const render = vi.fn();
    const coordinator = new FrameCoordinator(clock, advance, render);

    expect(coordinator.frame()).toBe(1234);
    expect(clock.getMapTimeMs).toHaveBeenCalledOnce();
    expect(advance).toHaveBeenCalledWith(1234, 1234);
    expect(render).toHaveBeenCalledWith(1234);
    coordinator.frame();
    expect(advance).toHaveBeenLastCalledWith(1234, 1234);
  });

  it('never reads the clock again when consumers reuse the returned frame snapshot', () => {
    const clock = { getMapTimeMs: vi.fn(() => 4321) };
    const coordinator = new FrameCoordinator(clock, vi.fn(), vi.fn());

    const frameMapTimeMs = coordinator.frame();
    const debugSnapshot = { mapTimeMs: frameMapTimeMs };

    expect(debugSnapshot.mapTimeMs).toBe(4321);
    expect(clock.getMapTimeMs).toHaveBeenCalledOnce();
  });

  it('starts a fresh zero-duration interval after pause/resume reset', () => {
    let mapTimeMs = 100;
    const advance = vi.fn();
    const coordinator = new FrameCoordinator({ getMapTimeMs: () => mapTimeMs }, advance, vi.fn());
    coordinator.frame();

    mapTimeMs = 500;
    coordinator.reset();
    coordinator.frame();

    expect(advance).toHaveBeenLastCalledWith(500, 500);
  });
});
