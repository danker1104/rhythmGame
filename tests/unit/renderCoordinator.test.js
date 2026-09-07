// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { RenderCoordinator, RenderLayer } from '../../src/renderer/renderCoordinator.js';

describe('RenderCoordinator', () => {
  it('draws one Canvas list in the documented layer order', () => {
    expect(RenderLayer.CURSOR).toBeGreaterThan(RenderLayer.HUD);
    const draw = vi.fn();
    const coordinator = new RenderCoordinator({ clearRect: vi.fn() }, 640, 480);
    coordinator.render([
      { layer: RenderLayer.HUD, draw: () => draw('hud') },
      { layer: RenderLayer.STORYBOARD_FOREGROUND, draw: () => draw('foreground') },
      { layer: RenderLayer.HIT_OBJECT, draw: () => draw('circle') },
      { layer: RenderLayer.STORYBOARD_OVERLAY, draw: () => draw('overlay') },
      { layer: RenderLayer.BACKGROUND, draw: () => draw('background') },
      { layer: RenderLayer.CURSOR, draw: () => draw('cursor') },
    ]);
    expect(draw.mock.calls.flat()).toEqual(['background', 'foreground', 'circle', 'overlay', 'hud', 'cursor']);
  });
});
