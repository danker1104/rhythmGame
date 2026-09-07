// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { UiSoundController } from '../../src/audio/uiSoundController.js';

describe('UiSoundController', () => {
  it('loads once and plays YUGEN UI sounds through the effect route', async () => {
    const engine = { unlockFromGesture: vi.fn(async () => {}), playEffect: vi.fn(), context: { state: 'running' } };
    const load = vi.fn(async () => new Map([['menuhit.wav', { kind: 'buffer', buffer: { id: 'hit' } }]]));
    const controller = new UiSoundController(/** @type {any} */ (engine), load);
    await controller.play('menuhit.wav');
    await controller.play('menuhit.wav');
    expect(load).toHaveBeenCalledOnce();
    expect(engine.unlockFromGesture).toHaveBeenCalledTimes(2);
    expect(engine.playEffect).toHaveBeenCalledTimes(2);
    expect(engine.playEffect).toHaveBeenLastCalledWith({ id: 'hit' }, 'effect', 0, 0.72);
  });

  it('keeps interaction usable when optional UI audio cannot load', async () => {
    const engine = { unlockFromGesture: vi.fn(async () => {}), playEffect: vi.fn(), context: { state: 'running' } };
    const controller = new UiSoundController(/** @type {any} */ (engine), async () => { throw new Error('offline'); });
    await expect(controller.play('menuclick.wav')).resolves.toBe(false);
    expect(engine.playEffect).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent loads during rapid selection changes', async () => {
    const engine = { unlockFromGesture: vi.fn(async () => {}), playEffect: vi.fn(), context: { state: 'running' } };
    const load = vi.fn(async () => new Map([['menuhit.wav', { kind: 'buffer', buffer: { id: 'hit' } }]]));
    const controller = new UiSoundController(/** @type {any} */ (engine), load);

    await Promise.all(Array.from({ length: 20 }, () => controller.play('menuhit.wav')));

    expect(load).toHaveBeenCalledOnce();
    expect(engine.playEffect).toHaveBeenCalledTimes(20);
  });
});
