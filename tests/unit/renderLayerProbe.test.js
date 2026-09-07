// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { renderLayerProbe } from '../../src/renderer/renderLayerProbe.js';

describe('renderLayerProbe', () => {
  it('paints the documented foreground, hit object, HUD and cursor probe colors', () => {
    const context = { clearRect: vi.fn(), fillRect: vi.fn(), fillStyle: '' };
    renderLayerProbe(/** @type {any} */ (context), 100, 40);
    expect(context.fillRect.mock.calls).toEqual([
      [0, 0, 100, 40],
      [10, 10, 40, 1],
      [20, 10, 30, 1],
      [30, 10, 20, 1],
      [40, 10, 10, 1],
    ]);
  });
});
