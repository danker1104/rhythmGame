// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { SpinnerSoundController } from '../../src/audio/spinnerSoundController.js';

describe('SpinnerSoundController', () => {
  it('loops spinnerspin while a channel is held during an active spinner', () => {
    const source = { loop: false, stop: vi.fn() };
    const audio = { playEffect: vi.fn(() => source) };
    const resolver = { resolve: vi.fn(() => ({ kind: 'buffer', buffer: /** @type {any} */ ({}) })) };
    const controller = new SpinnerSoundController(/** @type {any} */ (audio), /** @type {any} */ (resolver));
    const spinners = [{ startTimeMs: 1000, endTimeMs: 2000 }];

    controller.update(spinners, true, 1200);
    controller.update(spinners, true, 1300);
    controller.update(spinners, false, 1400);

    expect(resolver.resolve).toHaveBeenCalledWith('spinnerspin.wav');
    expect(audio.playEffect).toHaveBeenCalledTimes(1);
    expect(source.loop).toBe(true);
    expect(source.stop).toHaveBeenCalledTimes(1);
  });

  it('respects an explicit-silence spinner loop', () => {
    const audio = { playEffect: vi.fn() };
    const controller = new SpinnerSoundController(
      /** @type {any} */ (audio),
      /** @type {any} */ ({ resolve: () => ({ kind: 'silent' }) }),
    );

    controller.update([{ startTimeMs: 0, endTimeMs: 1000 }], true, 500);

    expect(audio.playEffect).not.toHaveBeenCalled();
  });
});
