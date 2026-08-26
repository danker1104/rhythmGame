import { describe, expect, it } from 'vitest';

import { createSceneManager } from '../src/app/sceneManager.js';

describe('scene manager', () => {
  it('moves through the stage-three scene flow', () => {
    const manager = createSceneManager();

    expect(manager.current).toBe('BOOT');
    manager.transitionTo('MENU');
    manager.transitionTo('DIFFICULTY_SELECT');
    manager.transitionTo('LOADING');
    manager.transitionTo('READY');
    manager.transitionTo('VISUAL_PREVIEW');
    manager.transitionTo('READY');

    expect(manager.current).toBe('READY');
  });

  it('rejects transitions that skip required preparation', () => {
    const manager = createSceneManager();
    expect(() => manager.transitionTo('READY')).toThrow('BOOT → READY');
  });
});
