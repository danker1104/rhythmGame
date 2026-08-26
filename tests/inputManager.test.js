// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { InputManager } from '../src/input/inputManager.js';

describe('InputManager', () => {
  it('uses KeyboardEvent.code, ignores repeat, and tracks key release', () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    const manager = new InputManager({ target: document, windowTarget: window, documentTarget: document, onPress, onRelease });
    manager.activate();

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', repeat: false, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', repeat: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', cancelable: true }));

    expect(onPress).toHaveBeenCalledOnce();
    expect(onPress).toHaveBeenCalledWith(0);
    expect(onRelease).toHaveBeenCalledWith(0);
    expect(manager.pressedLanes.size).toBe(0);
    manager.destroy();
  });

  it('releases all pressed lanes on blur and removes listeners on destroy', () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    const manager = new InputManager({ target: document, windowTarget: window, documentTarget: document, onPress, onRelease });
    manager.activate();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
    window.dispatchEvent(new Event('blur'));
    expect(onRelease).toHaveBeenCalledWith(2);

    manager.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('requests pause on Escape and focus loss', () => {
    const onPause = vi.fn();
    const manager = new InputManager({ target: document, windowTarget: window, documentTarget: document, onPause });
    manager.activate();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', cancelable: true }));
    window.dispatchEvent(new Event('blur'));
    expect(onPause).toHaveBeenCalledTimes(2);
    manager.destroy();
  });
});
