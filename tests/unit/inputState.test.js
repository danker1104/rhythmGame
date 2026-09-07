// @ts-check

import { describe, expect, it } from 'vitest';
import { InputState } from '../../src/input/inputState.js';

describe('InputState', () => {
  it('enqueues each inactive channel press independently', () => {
    const input = new InputState();
    expect(input.press('mouse-left', 100, { x: 10, y: 20 })).not.toBeNull();
    expect(input.press('key-left', 110, { x: 10, y: 20 })).not.toBeNull();
    expect(input.press('key-left', 111, { x: 10, y: 20 })).toBeNull();
    expect(input.drainTransitions()).toHaveLength(2);
  });

  it('maintains hold while any channel remains active', () => {
    const input = new InputState();
    input.press('mouse-left', 100, { x: 0, y: 0 });
    input.press('key-left', 101, { x: 0, y: 0 });
    input.release('mouse-left', 102, { x: 0, y: 0 });
    expect(input.isHolding).toBe(true);
    input.release('key-left', 103, { x: 0, y: 0 });
    expect(input.isHolding).toBe(false);
  });

  it('clears held channels without creating judgement presses', () => {
    const input = new InputState();
    input.press('mouse-right', 100, { x: 0, y: 0 });
    input.drainTransitions();
    input.clear(200, { x: 0, y: 0 });
    expect(input.isHolding).toBe(false);
    expect(input.drainTransitions()).toEqual([
      { channel: 'mouse-right', phase: 'release', mapTimeMs: 200, playfieldPosition: { x: 0, y: 0 }, synthetic: true },
    ]);
  });

  it('reports recent press feedback without turning it into another transition', () => {
    const input = new InputState();
    input.press('key-left', 1000, { x: 10, y: 20 });
    input.drainTransitions();

    expect([...input.pressFeedbackChannels(1079, 80)]).toEqual(['key-left']);
    expect([...input.pressFeedbackChannels(1081, 80)]).toEqual([]);
    expect(input.drainTransitions()).toEqual([]);
  });

  it('queues timestamped pointer movement without changing held channels', () => {
    const input = new InputState();
    input.press('mouse-left', 100, { x: 10, y: 20 });
    input.move(110, { x: 30, y: 40 });

    expect(input.isHolding).toBe(true);
    expect(input.drainTransitions().at(-1)).toEqual({
      channel: null,
      phase: 'move',
      mapTimeMs: 110,
      playfieldPosition: { x: 30, y: 40 },
      synthetic: false,
    });
  });

  it('drops unprocessed judgement presses when focus interruption clears input', () => {
    const input = new InputState();
    input.press('key-left', 100, { x: 10, y: 20 });

    input.clear(110, { x: 30, y: 40 });

    expect(input.drainTransitions()).toEqual([
      { channel: 'key-left', phase: 'release', mapTimeMs: 110, playfieldPosition: { x: 30, y: 40 }, synthetic: true },
    ]);
  });
});
