// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app/app.js';

function click(selector) {
  document.querySelector(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('stage-three app flow', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('unlocks audio, selects a difficulty and reaches READY after loading', async () => {
    const unlockAudio = vi.fn().mockResolvedValue({ state: 'running' });
    const loadResources = vi.fn(async ({ difficultyId, onProgress }) => {
      onProgress({ completed: 6, total: 6, percent: 100, current: '메뉴 효과음' });
      return {
        difficulty: { id: difficultyId, label: 'Hard' },
        beatmap: { hitObjects: Array.from({ length: 1214 }) },
      };
    });

    createApp(document.querySelector('#app'), { unlockAudio, loadResources, baseUrl: '/' });
    expect(document.querySelector('[data-action="start"]')).not.toBeNull();

    click('[data-action="start"]');
    await vi.waitFor(() => expect(unlockAudio).toHaveBeenCalledOnce());
    click('[data-action="choose-difficulty"]');
    click('[data-difficulty-id="hard"]');
    click('[data-action="load"]');

    await vi.waitFor(() => expect(document.querySelector('[data-scene="READY"]')).not.toBeNull());
    expect(loadResources).toHaveBeenCalledWith(expect.objectContaining({ difficultyId: 'hard' }));
    expect(document.body.textContent).toContain('1,214');
  });

  it('shows the failed resource and lets the user retry', async () => {
    const loadResources = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('비트맵 요청 실패'), {
        resourceType: '비트맵',
        path: 'songs/the-last-page/easy.osu',
      }))
      .mockResolvedValueOnce({
        difficulty: { id: 'easy', label: 'Easy' },
        beatmap: { hitObjects: Array.from({ length: 547 }) },
      });

    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }),
      loadResources,
      baseUrl: '/',
    });

    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]');
    click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-scene="ERROR"]')).not.toBeNull());

    expect(document.body.textContent).toContain('비트맵');
    expect(document.body.textContent).toContain('easy.osu');
    click('[data-action="retry"]');

    await vi.waitFor(() => expect(document.querySelector('[data-scene="READY"]')).not.toBeNull());
    expect(loadResources).toHaveBeenCalledTimes(2);
  });

  it('plays a preview and wires READY playback controls to the audio system', async () => {
    const audioEngine = {
      load: vi.fn().mockResolvedValue({ duration: 140 }),
      playPreview: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
    };
    const effects = { load: vi.fn().mockResolvedValue({}), play: vi.fn() };
    const createAudioSystem = vi.fn(() => ({ audioEngine, effects }));
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    const loadResources = vi.fn().mockResolvedValue({
      difficulty: { id: 'easy', label: 'Easy' },
      beatmap: { hitObjects: Array.from({ length: 547 }) },
      audioData: new ArrayBuffer(8),
      optionalEffects: { menuClick: new ArrayBuffer(8) },
    });

    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }),
      createAudioSystem,
      loadResources,
      fetchImpl,
      baseUrl: '/',
    });

    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]');
    click('[data-action="preview"]');
    await vi.waitFor(() => expect(audioEngine.playPreview).toHaveBeenCalledWith('song', 98934, 15000));
    click('[data-action="stop-preview"]');
    expect(audioEngine.stop).toHaveBeenCalled();

    click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-scene="READY"]')).not.toBeNull());
    expect(audioEngine.load).toHaveBeenCalledWith('song', expect.any(ArrayBuffer));
    expect(effects.load).toHaveBeenCalledWith('menuClick', expect.any(ArrayBuffer));

    click('[data-action="play-song"]');
    click('[data-action="resume-song"]');
    expect(audioEngine.play).toHaveBeenCalledWith('song', { offsetMs: 0 });
    expect(audioEngine.resume).toHaveBeenCalled();
    expect(document.querySelector('[data-action="pause-song"]')).toBeNull();
    expect(document.querySelector('[data-action="stop-song"]')).toBeNull();
  });

  it('renders visible notes from the audio clock in the Canvas preview', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 7500 } };
    const renderer = { setBeatmap: vi.fn(), render: vi.fn(() => ({ visibleNotes: 8, totalNotes: 547 })) };
    let frameCallback;

    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }),
      createAudioSystem: vi.fn(() => audioSystem),
      loadResources: vi.fn().mockResolvedValue({
        difficulty: { id: 'easy', label: 'Easy' },
        beatmap: { hitObjects: [{ id: 1, lane: 0, startTimeMs: 7550, endTimeMs: null, kind: 'tap' }] },
      }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }),
      createRenderer: vi.fn(() => renderer),
      requestFrame: vi.fn((callback) => { frameCallback = callback; return 1; }),
      cancelFrame: vi.fn(),
      baseUrl: '/',
    });

    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]');
    click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="open-visual-preview"]')).not.toBeNull());
    click('[data-action="open-visual-preview"]');

    expect(document.querySelector('[data-scene="VISUAL_PREVIEW"] canvas')).not.toBeNull();
    expect(renderer.setBeatmap).toHaveBeenCalled();
    expect(audioEngine.play).toHaveBeenCalledWith('song', { offsetMs: 6000 });
    frameCallback();
    expect(renderer.render).toHaveBeenCalledWith({ songTimeMs: 7500, pixelsPerMs: 0.45 });
  });

  it('owns keyboard input in PLAYING and updates the HUD from audio-clock judgements', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 1000 } };
    const renderer = { setBeatmap: vi.fn(), render: vi.fn(() => ({ visibleNotes: 1, totalNotes: 1 })) };
    let inputOptions;
    let frameCallback;
    const inputManager = { activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() };

    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }),
      createAudioSystem: vi.fn(() => audioSystem),
      loadResources: vi.fn().mockResolvedValue({
        difficulty: { id: 'easy', label: 'Easy' },
        beatmap: { hitObjects: [{ id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 0 }] },
      }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }),
      createRenderer: vi.fn(() => renderer),
      createInputManager: vi.fn((options) => { inputOptions = options; return inputManager; }),
      requestFrame: vi.fn((callback) => { frameCallback = callback; return 1; }),
      cancelFrame: vi.fn(),
      baseUrl: '/',
    });

    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]');
    click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    click('[data-action="start-game"]');

    expect(document.querySelector('[data-scene="PLAYING"]')).not.toBeNull();
    const feedback = document.querySelector('.playfield-feedback');
    expect(feedback).not.toBeNull();
    expect(feedback.querySelector('[data-combo]').nextElementSibling.hasAttribute('data-judgement')).toBe(true);
    expect(document.querySelector('.game-hud [data-combo]')).toBeNull();
    expect(inputManager.activate).toHaveBeenCalledOnce();
    inputOptions.onPress(0);
    frameCallback();

    expect(document.querySelector('[data-score]').textContent).toBe('1000000');
    expect(document.querySelector('[data-combo]').textContent).toBe('1');
    expect(document.querySelector('[data-judgement]').dataset.judgement).toBe('perfect');
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ songTimeMs: 1000 }));
  });

  it('pauses on focus loss and supports resume and restart', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 500 } };
    let latestInputOptions;
    const makeInput = vi.fn((options) => {
      latestInputOptions = options;
      return { activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() };
    });

    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }), createAudioSystem: () => audioSystem,
      loadResources: vi.fn().mockResolvedValue({ difficulty: { id: 'easy', label: 'Easy' }, beatmap: { hitObjects: [{ id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap' }] } }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }), createRenderer: () => ({ setBeatmap: vi.fn(), render: vi.fn() }),
      createInputManager: makeInput, requestFrame: vi.fn(() => 1), cancelFrame: vi.fn(), baseUrl: '/',
    });
    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]'); click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    click('[data-action="start-game"]'); latestInputOptions.onPause();
    expect(document.querySelector('[data-scene="PAUSED"]')).not.toBeNull();
    expect(audioEngine.pause).toHaveBeenCalled();

    click('[data-action="resume-game"]');
    expect(document.querySelector('[data-scene="PLAYING"]')).not.toBeNull();
    expect(audioEngine.resume).toHaveBeenCalled();
    latestInputOptions.onPause(); click('[data-action="restart-game"]');
    expect(audioEngine.play).toHaveBeenLastCalledWith('song', { offsetMs: 0 });
  });

  it('finishes after the final note and saves a new local best result', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 3000 } };
    let frameCallback;
    const repository = { loadSettings: vi.fn(() => ({ keyBindings: ['KeyD','KeyF','KeyJ','KeyK'], scrollSpeed: 1, offsetMs: 0, masterVolume: 1, effectVolume: 0.8, musicMuted: false, effectsMuted: false, lastDifficultyId: 'easy' })), saveSettings: vi.fn(), saveBestResult: vi.fn(() => true), getBestResult: vi.fn() };
    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }), createAudioSystem: () => audioSystem,
      loadResources: vi.fn().mockResolvedValue({ difficulty: { id: 'easy', label: 'Easy' }, beatmap: { hitObjects: [{ id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap' }] } }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }), createRenderer: () => ({ setBeatmap: vi.fn(), render: vi.fn() }),
      createInputManager: () => ({ activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() }),
      requestFrame: vi.fn((callback) => { frameCallback = callback; return 1; }), cancelFrame: vi.fn(), repository, baseUrl: '/',
    });
    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]'); click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    click('[data-action="start-game"]'); frameCallback();
    expect(document.querySelector('[data-scene="RESULT"]')).not.toBeNull();
    expect(document.body.textContent).toContain('NEW BEST');
    expect(repository.saveBestResult).toHaveBeenCalledOnce();
  });

  it('ends the game immediately when misses reduce HP to zero', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 1500 } };
    const notes = Array.from({ length: 17 }, (_, id) => ({
      id, lane: id % 4, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 0,
    }));
    let frameCallback;
    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }), createAudioSystem: () => audioSystem,
      loadResources: vi.fn().mockResolvedValue({ difficulty: { id: 'easy', label: 'Easy' }, beatmap: { hitObjects: notes } }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }), createRenderer: () => ({ setBeatmap: vi.fn(), render: vi.fn() }),
      createInputManager: () => ({ activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() }),
      requestFrame: vi.fn((callback) => { frameCallback = callback; return 1; }), cancelFrame: vi.fn(), baseUrl: '/',
    });
    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]'); click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    click('[data-action="start-game"]'); frameCallback();

    expect(document.querySelector('[data-scene="RESULT"]')).not.toBeNull();
    expect(document.body.textContent).toContain('FAILED');
    expect(audioEngine.stop).toHaveBeenCalled();
  });

  it('shows the configured lane keys during gameplay', async () => {
    const audioSystem = {
      audioEngine: { load: vi.fn(), play: vi.fn(), stop: vi.fn() },
      effects: { load: vi.fn(), play: vi.fn() },
      clock: { songTimeMs: 0 },
    };
    const repository = {
      loadSettings: vi.fn(() => ({
        keyBindings: ['KeyA', 'KeyS', 'KeyL', 'Semicolon'], scrollSpeed: 1, offsetMs: 0,
        masterVolume: 1, effectVolume: 0.8, musicMuted: false, effectsMuted: false,
        lastDifficultyId: 'easy',
      })),
      saveSettings: vi.fn(),
    };
    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }),
      createAudioSystem: () => audioSystem,
      loadResources: vi.fn().mockResolvedValue({
        difficulty: { id: 'easy', label: 'Easy' },
        beatmap: { hitObjects: [{ id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap' }] },
      }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }),
      createRenderer: () => ({ setBeatmap: vi.fn(), render: vi.fn() }),
      createInputManager: () => ({ activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() }),
      requestFrame: vi.fn(() => 1), cancelFrame: vi.fn(), repository, baseUrl: '/',
    });

    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]'); click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    const speedControl = document.querySelector('[data-setting="scrollSpeed"]');
    expect(speedControl).not.toBeNull();
    expect(speedControl.closest('label').textContent).toContain('노트 속도');
    click('[data-action="start-game"]');

    expect([...document.querySelectorAll('.key-guide kbd')].map(({ textContent }) => textContent)).toEqual(['A', 'S', 'L', ';']);
  });

  it('starts a fresh game immediately when retrying from results', async () => {
    const audioEngine = { load: vi.fn(), play: vi.fn(), stop: vi.fn() };
    const audioSystem = { audioEngine, effects: { load: vi.fn(), play: vi.fn() }, clock: { songTimeMs: 3000 } };
    let frameCallback;
    createApp(document.querySelector('#app'), {
      unlockAudio: vi.fn().mockResolvedValue({ state: 'running' }), createAudioSystem: () => audioSystem,
      loadResources: vi.fn().mockResolvedValue({ difficulty: { id: 'easy', label: 'Easy' }, beatmap: { hitObjects: [{ id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap' }] } }),
      loadSkin: vi.fn().mockResolvedValue({ skin: {}, textures: {} }), createRenderer: () => ({ setBeatmap: vi.fn(), render: vi.fn() }),
      createInputManager: () => ({ activate: vi.fn(), destroy: vi.fn(), pressedLanes: new Set() }),
      requestFrame: vi.fn((callback) => { frameCallback = callback; return 1; }), cancelFrame: vi.fn(), baseUrl: '/',
    });
    click('[data-action="start"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="choose-difficulty"]')).not.toBeNull());
    click('[data-action="choose-difficulty"]'); click('[data-action="load"]');
    await vi.waitFor(() => expect(document.querySelector('[data-action="start-game"]')).not.toBeNull());
    click('[data-action="start-game"]'); frameCallback();

    click('[data-action="retry-result"]');

    expect(document.querySelector('[data-scene="PLAYING"]')).not.toBeNull();
    expect(audioEngine.play).toHaveBeenLastCalledWith('song', { offsetMs: 0 });
  });
});
