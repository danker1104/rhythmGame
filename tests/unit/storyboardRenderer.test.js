// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { StoryboardRenderer } from '../../src/storyboard/storyboardRenderer.js';
import { RenderLayer } from '../../src/renderer/renderCoordinator.js';

describe('StoryboardRenderer', () => {
  it('partitions underlay and overlay while preserving object declaration order', () => {
    const mapper = { scale: 1, storyboardToScreen: (/** @type {any} */ point) => point };
    const image = { width: 100, height: 50 };
    const images = new Map([['a.png', image], ['b.png', image]]);
    const storyboard = { layers: [
      { name: 'Foreground', objects: [{ id: 'a', layer: 'Foreground', kind: 'sprite', path: 'a.png', activePath: 'a.png', origin: 'Centre', startTimeMs: 0, endTimeMs: 10, evaluated: { opacity: 1, position: { x: 10, y: 20 }, scale: { x: 1, y: 1 } } }] },
      { name: 'Overlay', objects: [{ id: 'b', layer: 'Overlay', kind: 'sprite', path: 'b.png', activePath: 'b.png', origin: 'Centre', startTimeMs: 0, endTimeMs: 10, evaluated: { opacity: 1, position: { x: 10, y: 20 }, scale: { x: 1, y: 1 } } }] },
    ] };
    const renderer = new StoryboardRenderer(mapper, /** @type {any} */ (images));
    const commands = renderer.createDrawCommands(storyboard.layers.flatMap((layer) => layer.objects));
    expect(commands.map((command) => command.layer)).toEqual([RenderLayer.STORYBOARD_FOREGROUND, RenderLayer.STORYBOARD_OVERLAY]);
    const context = { save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(), set globalAlpha(/** @type {number} */ _value) {} };
    commands[0].draw(/** @type {any} */ (context));
    expect(context.drawImage).toHaveBeenCalledWith(image, -40, -5, 100, 50);
  });

  it('omits only the object whose image is missing', () => {
    const renderer = new StoryboardRenderer({ scale: 1, storyboardToScreen: (/** @type {any} */ point) => point }, new Map());
    expect(renderer.createDrawCommands([{ layer: 'Background', activePath: 'missing.png' }])).toEqual([]);
  });

  it('disables an entire animation when any declared frame is missing', () => {
    const mapper = { scale: 1, storyboardToScreen: (/** @type {any} */ point) => point };
    const image = { width: 100, height: 50 };
    const renderer = new StoryboardRenderer(/** @type {any} */ (mapper), /** @type {any} */ (new Map([
      ['SB/idle0.png', image],
      ['SB/idle2.png', image],
    ])));
    const animation = {
      id: 'idle', layer: 'Foreground', kind: 'animation', path: 'SB/idle.png', activePath: 'SB/idle0.png',
      frameCount: 3, origin: 'Centre', evaluated: { opacity: 1, position: { x: 10, y: 20 }, scale: { x: 1, y: 1 } },
    };

    expect(renderer.createDrawCommands([animation])).toEqual([]);
  });

  it('renders an animation when every declared frame is available', () => {
    const mapper = { scale: 1, storyboardToScreen: (/** @type {any} */ point) => point };
    const image = { width: 100, height: 50 };
    const renderer = new StoryboardRenderer(/** @type {any} */ (mapper), /** @type {any} */ (new Map([
      ['SB/idle0.png', image],
      ['SB/idle1.png', image],
      ['SB/idle2.png', image],
    ])));
    const animation = {
      id: 'idle', layer: 'Foreground', kind: 'animation', path: 'SB/idle.png', activePath: 'SB/idle1.png',
      frameCount: 3, origin: 'Centre', evaluated: { opacity: 1, position: { x: 10, y: 20 }, scale: { x: 1, y: 1 } },
    };

    expect(renderer.createDrawCommands([animation])).toHaveLength(1);
  });
});
