// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { CoordinateMapper } from '../../src/input/coordinateMapper.js';
import { InputManager } from '../../src/input/inputManager.js';

function createManager() {
  const pause = vi.fn();
  const clock = { eventTimestampToMapTime: vi.fn((timestamp) => ({ mapTimeMs: timestamp + 10, fallback: false })), getMapTimeMs: () => 999 };
  const mapper = new CoordinateMapper(640, 480, 1);
  const manager = new InputManager({ clock, mapper, requestPause: pause });
  manager.setActive(true);
  manager.setCursorScreenPosition({ x: 320, y: 240 });
  return { manager, pause };
}

describe('InputManager', () => {
  it('ignores keyboard repeat but accepts a different channel while held', () => {
    const { manager } = createManager();
    manager.handleKeyDown({ code: 'KeyZ', repeat: false, timeStamp: 100, target: null, preventDefault: vi.fn() });
    manager.handleKeyDown({ code: 'KeyZ', repeat: true, timeStamp: 101, target: null, preventDefault: vi.fn() });
    manager.handleKeyDown({ code: 'KeyX', repeat: false, timeStamp: 102, target: null, preventDefault: vi.fn() });
    expect(manager.state.drainTransitions().map((event) => event.channel)).toEqual(['key-left', 'key-right']);
    expect(manager.state.isHolding).toBe(true);
    expect(manager.pressCounts).toEqual({ 'mouse-left': 0, 'mouse-right': 0, 'key-left': 1, 'key-right': 1 });
  });

  it('keeps keyboard hold after the mouse channel is released', () => {
    const { manager } = createManager();
    manager.handlePointerDown({ button: 0, pointerId: 1, timeStamp: 100, preventDefault: vi.fn(), currentTarget: { setPointerCapture: vi.fn() } });
    manager.handleKeyDown({ code: 'KeyZ', repeat: false, timeStamp: 101, target: null, preventDefault: vi.fn() });
    manager.handlePointerUp({ button: 0, timeStamp: 102 });
    expect(manager.state.isHolding).toBe(true);
    expect(manager.pressCounts['mouse-left']).toBe(1);
  });

  it('clears input and requests one pause on focus interruption', () => {
    const { manager, pause } = createManager();
    manager.handleKeyDown({ code: 'KeyZ', repeat: false, timeStamp: 100, target: null, preventDefault: vi.fn() });
    manager.interrupt('visibility-hidden');
    manager.interrupt('visibility-hidden');
    expect(manager.state.isHolding).toBe(false);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('rejects duplicate keyboard bindings', () => {
    const { manager } = createManager();
    expect(() => manager.setKeyBindings(['KeyZ', 'KeyZ'])).toThrow('INPUT_BINDING_DUPLICATE');
  });

  it('maps active pointer movement timestamps into the rules transition queue', () => {
    const { manager } = createManager();

    manager.handlePointerMove({ clientX: 330, clientY: 250, timeStamp: 120 }, { left: 0, top: 0 });

    expect(manager.state.drainTransitions()).toEqual([
      {
        channel: null,
        phase: 'move',
        mapTimeMs: 130,
        playfieldPosition: { x: 266, y: 202 },
        synthetic: false,
      },
    ]);
  });

  it('counts timestamp fallbacks as a bounded diagnostic metric', () => {
    const { manager } = createManager();
    manager.clock.eventTimestampToMapTime = vi.fn(() => ({ mapTimeMs: 500, fallback: true }));

    manager.handleKeyDown({ code: 'KeyZ', repeat: false, timeStamp: 100, target: null, preventDefault: vi.fn() });
    manager.handlePointerMove({ clientX: 320, clientY: 240, timeStamp: 110 }, { left: 0, top: 0 });

    expect(manager.timestampFallbackCount).toBe(2);
  });
});
