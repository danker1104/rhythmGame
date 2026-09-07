// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { SliderSoundController } from '../../src/audio/sliderSoundController.js';

describe('SliderSoundController', () => {
  it('starts one loop while held and stops it on release', () => {
    const source = { loop: false, stop: vi.fn() };
    const audio = { playEffect: vi.fn(() => source) };
    const resolver = { resolve: vi.fn(() => ({ kind: 'buffer', buffer: /** @type {any} */ ({}) })) };
    const controller = new SliderSoundController(/** @type {any} */ (audio), /** @type {any} */ (resolver));
    const sliders = [{ startTimeMs: 1000, endTimeMs: 2000, samples: [] }];

    controller.update(sliders, true, 1200);
    controller.update(sliders, true, 1300);
    controller.update(sliders, false, 1400);

    expect(audio.playEffect).toHaveBeenCalledTimes(1);
    expect(source.loop).toBe(true);
    expect(source.stop).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith('normal-sliderslide.wav', 1);
  });

  it('does not create a source for an explicit-silence loop', () => {
    const audio = { playEffect: vi.fn() };
    const controller = new SliderSoundController(/** @type {any} */ (audio), /** @type {any} */ ({ resolve: () => ({ kind: 'silent' }) }));
    controller.update([{ startTimeMs: 0, endTimeMs: 1000, samples: [{ customIndex: 1 }] }], true, 500);
    expect(audio.playEffect).not.toHaveBeenCalled();
  });
});
