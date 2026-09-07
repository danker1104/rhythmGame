// @ts-check

import { describe, expect, it } from 'vitest';
import { SceneMachine } from '../../src/app/sceneMachine.js';

describe('SceneMachine', () => {
  it('follows the documented loading and gameplay lifecycle', () => {
    const scenes = new SceneMachine('BOOT');
    for (const scene of /** @type {Array<any>} */ (['CONSENT', 'CATALOG', 'DIFFICULTY_SELECT', 'LOADING', 'READY', 'PLAYING', 'PAUSED', 'PLAYING', 'RESULT', 'READY'])) scenes.transition(scene);
    expect(scenes.current).toBe('READY');
  });

  it('rejects transitions outside the lifecycle graph', () => {
    const scenes = new SceneMachine('BOOT');
    expect(() => scenes.transition('PLAYING')).toThrow('SCENE_TRANSITION_INVALID');
  });
});
