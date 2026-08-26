import { CONTENT } from '../config/contentManifest.js';
import { resolveContentUrl } from '../config/resolveContentUrl.js';
import { GameSession } from '../engine/gameSession.js';
import { InputManager } from '../input/inputManager.js';
import { DEFAULT_SETTINGS } from '../storage/localRepository.js';
import { GameplayRenderer } from '../renderer/gameplayRenderer.js';
import { createSceneManager } from './sceneManager.js';

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function keyLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const labels = { Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: 'Space' };
  return labels[code] ?? code;
}

export function createApp(root, {
  unlockAudio,
  createAudioSystem = () => null,
  loadResources,
  loadSkin = null,
  createRenderer = (canvas, options) => new GameplayRenderer(canvas, options),
  createGameSession = (notes) => new GameSession(notes),
  createInputManager = (options) => new InputManager(options),
  requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
  cancelFrame = (id) => globalThis.cancelAnimationFrame(id),
  repository = null,
  fetchImpl = globalThis.fetch,
  baseUrl = '/',
}) {
  if (!root) throw new Error('App root is required');

  const scenes = createSceneManager();
  const savedSettings = repository?.loadSettings() ?? { ...DEFAULT_SETTINGS, keyBindings: [...DEFAULT_SETTINGS.keyBindings] };
  const state = {
    selectedDifficultyId: savedSettings.lastDifficultyId,
    settings: savedSettings,
    bootError: null,
    progress: { completed: 0, total: 1, percent: 0, current: '준비 중' },
    warnings: [],
    loadError: null,
    resources: null,
    audioSystem: null,
    previewState: 'idle',
    previewError: null,
    playbackState: 'stopped',
    skinBundle: null,
    renderer: null,
    animationFrameId: null,
    gameSession: null,
    inputManager: null,
    lastJudgement: null,
    result: null,
    isNewBest: false,
    capturingLane: null,
    settingsError: null,
  };

  function selectedDifficulty() {
    return CONTENT.song.difficulties.find(({ id }) => id === state.selectedDifficultyId);
  }

  function sceneFrame(scene, content) {
    return `<main class="scene" data-scene="${scene}">${content}</main>`;
  }

  function renderBoot() {
    root.innerHTML = sceneFrame('BOOT', `
      <section class="intro-panel" aria-labelledby="game-title">
        <img class="mode-icon" src="${resolveContentUrl(CONTENT.skin.images.modeIcon, baseUrl)}" alt="4키 Mania 모드" />
        <p class="eyebrow">ARForest</p>
        <h1 id="game-title">${CONTENT.song.title}</h1>
        <p class="creator">Beatmap by ${CONTENT.song.creator}</p>
        <p class="intro-copy">네 개의 키로 마지막 페이지를 연주하세요.</p>
        ${state.bootError ? `<p class="error-message" role="alert">${escapeHtml(state.bootError)}</p>` : ''}
        <button class="primary-action" type="button" data-action="start">시작하기</button>
        <p class="gesture-note">버튼을 누르면 브라우저 오디오가 활성화됩니다.</p>
      </section>
    `);
  }

  function renderMenu() {
    root.innerHTML = sceneFrame('MENU', `
      <section class="menu-panel" aria-labelledby="menu-title">
        <p class="eyebrow">4Key web rhythm game</p>
        <h1 id="menu-title">${CONTENT.song.title}</h1>
        <p class="menu-subtitle">오디오가 준비되었습니다.</p>
        <button class="primary-action" type="button" data-action="choose-difficulty">난이도 선택</button>
        <button class="text-action settings-link" type="button" data-action="open-settings">설정</button>
      </section>
      <aside class="song-stamp" aria-label="곡 정보">
        <span>${CONTENT.song.artist}</span>
        <strong>195 BPM</strong>
        <span>4 Keys</span>
      </aside>
    `);
  }

  function renderSettings() {
    const settings = state.settings;
    root.innerHTML = sceneFrame('SETTINGS', `
      <section class="settings-panel" aria-labelledby="settings-title">
        <button class="text-action" type="button" data-action="close-settings">← 메뉴</button>
        <p class="eyebrow">LOCAL SETTINGS</p><h1 id="settings-title">설정</h1>
        <div class="settings-grid">
          <fieldset><legend>키 설정</legend><div class="key-binding-row">${settings.keyBindings.map((code, lane) => `<button type="button" data-key-lane="${lane}">${state.capturingLane === lane ? '키 입력…' : escapeHtml(code.replace('Key', ''))}</button>`).join('')}</div>${state.settingsError ? `<p class="error-message">${escapeHtml(state.settingsError)}</p>` : ''}</fieldset>
          <label>노트 속도 <output>${settings.scrollSpeed.toFixed(2)}×</output><input type="range" min="0.5" max="2" step="0.05" value="${settings.scrollSpeed}" data-setting="scrollSpeed"></label>
          <label>입력 오프셋 <output>${settings.offsetMs}ms</output><input type="range" min="-300" max="300" step="1" value="${settings.offsetMs}" data-setting="offsetMs"></label>
          <label>마스터 음량 <output>${Math.round(settings.masterVolume * 100)}%</output><input type="range" min="0" max="1" step="0.01" value="${settings.masterVolume}" data-setting="masterVolume"></label>
          <label>효과음 음량 <output>${Math.round(settings.effectVolume * 100)}%</output><input type="range" min="0" max="1" step="0.01" value="${settings.effectVolume}" data-setting="effectVolume"></label>
          <label class="check-setting"><input type="checkbox" data-setting="musicMuted" ${settings.musicMuted ? 'checked' : ''}> 음악 음소거</label>
          <label class="check-setting"><input type="checkbox" data-setting="effectsMuted" ${settings.effectsMuted ? 'checked' : ''}> 효과음 음소거</label>
        </div>
        <button class="secondary-action" type="button" data-action="reset-settings">기본값 복원</button>
      </section>`);
  }

  function difficultyCard(difficulty) {
    const selected = difficulty.id === state.selectedDifficultyId;
    return `
      <button
        class="difficulty-card${selected ? ' is-selected' : ''}"
        type="button"
        data-difficulty-id="${difficulty.id}"
        aria-pressed="${selected}"
      >
        <span class="difficulty-name">${difficulty.label}</span>
        <span class="difficulty-stats">
          <span><small>OD / HP</small>${difficulty.overallDifficulty} / ${difficulty.hpDrainRate}</span>
          <span><small>NOTES</small>${formatNumber(difficulty.noteCount)}</span>
          <span><small>HOLDS</small>${formatNumber(difficulty.holdCount)}</span>
        </span>
      </button>
    `;
  }

  function renderDifficultySelect() {
    root.innerHTML = sceneFrame('DIFFICULTY_SELECT', `
      <header class="scene-header">
        <button class="text-action" type="button" data-action="back-to-menu">← 메뉴</button>
        <div>
          <p class="eyebrow">${CONTENT.song.artist} — ${CONTENT.song.title}</p>
          <h1>난이도 선택</h1>
        </div>
      </header>
      <section class="difficulty-grid" aria-label="난이도 목록">
        ${CONTENT.song.difficulties.map(difficultyCard).join('')}
      </section>
      <footer class="selection-footer">
        <div>
          <p><strong>${selectedDifficulty().label}</strong> · 미리듣기 시작 ${Math.floor(CONTENT.song.previewTimeMs / 1000)}초</p>
          ${state.previewError ? `<p class="error-message" role="alert">${escapeHtml(state.previewError)}</p>` : ''}
        </div>
        <div class="action-row compact-actions">
          ${state.previewState === 'playing'
            ? '<button class="secondary-action" type="button" data-action="stop-preview">미리듣기 중지</button>'
            : `<button class="secondary-action" type="button" data-action="preview" ${state.previewState === 'loading' ? 'disabled' : ''}>${state.previewState === 'loading' ? '음원 준비 중…' : '15초 미리듣기'}</button>`}
          <button class="primary-action" type="button" data-action="load">선택 완료</button>
        </div>
      </footer>
    `);
  }

  function renderLoading() {
    const difficulty = selectedDifficulty();
    root.innerHTML = sceneFrame('LOADING', `
      <section class="loading-panel" aria-labelledby="loading-title">
        <p class="eyebrow">${difficulty.label}</p>
        <h1 id="loading-title">플레이 준비 중</h1>
        <p class="loading-current" data-loading-current role="status">${state.progress.current}</p>
        <div class="progress-track" role="progressbar" aria-label="리소스 로딩" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.progress.percent}">
          <span data-progress-bar style="width: ${state.progress.percent}%"></span>
        </div>
        <p class="progress-value" data-progress-value>${state.progress.percent}%</p>
      </section>
    `);
  }

  function updateProgress(progress) {
    state.progress = progress;
    if (scenes.current !== 'LOADING') return;
    const current = root.querySelector('[data-loading-current]');
    const bar = root.querySelector('[data-progress-bar]');
    const value = root.querySelector('[data-progress-value]');
    const track = root.querySelector('[role="progressbar"]');
    if (current) current.textContent = `${progress.current} 불러오는 중`;
    if (bar) bar.style.width = `${progress.percent}%`;
    if (value) value.textContent = `${progress.percent}%`;
    track?.setAttribute('aria-valuenow', String(progress.percent));
  }

  function renderError() {
    const error = state.loadError;
    root.innerHTML = sceneFrame('ERROR', `
      <section class="error-panel" aria-labelledby="error-title">
        <p class="eyebrow">LOAD INTERRUPTED</p>
        <h1 id="error-title">리소스를 불러오지 못했습니다</h1>
        <dl class="error-details">
          <div><dt>종류</dt><dd>${escapeHtml(error.resourceType ?? '알 수 없음')}</dd></div>
          <div><dt>파일</dt><dd>${escapeHtml(error.path ?? '경로 정보 없음')}</dd></div>
        </dl>
        <p class="error-message" role="alert">${escapeHtml(error.message)}</p>
        <div class="action-row">
          <button class="primary-action" type="button" data-action="retry">다시 시도</button>
          <button class="secondary-action" type="button" data-action="back-to-difficulties">난이도 선택</button>
        </div>
      </section>
    `);
  }

  function renderReady() {
    const difficulty = selectedDifficulty();
    const parsedCount = state.resources.beatmap.hitObjects.length;
    root.innerHTML = sceneFrame('READY', `
      <section class="ready-panel" aria-labelledby="ready-title">
        <p class="ready-kicker">READY</p>
        <h1 id="ready-title">${difficulty.label}</h1>
        <p>${formatNumber(parsedCount)}개 노트와 필수 리소스가 준비되었습니다.</p>
        ${state.warnings.length ? `<ul class="warning-list">${state.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}
        <p class="audio-status" role="status">음악 상태: ${state.playbackState}</p>
        <label class="ready-speed-control">노트 속도 <output>${state.settings.scrollSpeed.toFixed(2)}×</output><input type="range" min="0.5" max="2" step="0.05" value="${state.settings.scrollSpeed}" data-setting="scrollSpeed"></label>
        <div class="action-row audio-controls" aria-label="음악 재생 컨트롤">
          <button class="primary-action" type="button" data-action="play-song">처음부터 재생</button>
          <button class="secondary-action" type="button" data-action="resume-song">이어 재생</button>
        </div>
        ${state.skinBundle ? '<button class="visual-preview-action" type="button" data-action="open-visual-preview">Canvas 노트 렌더링 보기 →</button>' : ''}
        ${state.skinBundle ? '<button class="primary-action start-game-action" type="button" data-action="start-game">게임 시작</button>' : ''}
        <p class="stage-note">플레이 중 Escape를 누르면 언제든 잠시 멈출 수 있습니다.</p>
        <button class="text-action" type="button" data-action="back-to-difficulties">← 다른 난이도 선택</button>
      </section>
    `);
  }

  function renderVisualPreview() {
    root.innerHTML = sceneFrame('VISUAL_PREVIEW', `
      <section class="visual-preview" style="--song-background: url('${resolveContentUrl(CONTENT.song.backgroundPath, baseUrl)}')">
        <canvas class="game-canvas" aria-label="YUGEN 4Key 노트 렌더링 미리보기"></canvas>
        <div class="preview-hud">
          <p class="eyebrow">RENDER PREVIEW</p>
          <strong>${selectedDifficulty().label}</strong>
          <span data-render-stats>가시 노트 계산 중</span>
        </div>
        <button class="preview-back" type="button" data-action="close-visual-preview">← READY로 돌아가기</button>
      </section>
    `);
  }

  function renderPlaying() {
    root.innerHTML = sceneFrame('PLAYING', `
      <section class="gameplay-stage" style="--song-background: url('${resolveContentUrl(CONTENT.song.backgroundPath, baseUrl)}')">
        <div class="gameplay-canvas-frame">
          <canvas class="game-canvas" aria-label="The Last Page 4Key 플레이 화면"></canvas>
          <div class="playfield-feedback" aria-live="polite">
            <strong class="playfield-combo" data-combo></strong>
            <span class="judgement-display" data-judgement>READY</span>
          </div>
        </div>
        <div class="game-hud" aria-label="플레이 상태">
          <span>SCORE <strong data-score>0</strong></span>
          <span>ACC <strong data-accuracy>0.00%</strong></span>
          <span>HP <strong data-hp>100</strong></span>
        </div>
        <div class="key-guide" aria-label="현재 키 설정">${state.settings.keyBindings.map((code) => `<kbd>${escapeHtml(keyLabel(code))}</kbd>`).join('')}</div>
        <button class="preview-back" type="button" data-action="exit-game">플레이 종료</button>
      </section>
    `);
  }

  function renderPaused() {
    root.innerHTML = sceneFrame('PAUSED', `
      <section class="pause-panel" aria-labelledby="pause-title">
        <p class="eyebrow">PAUSED</p>
        <h1 id="pause-title">잠시 멈춤</h1>
        <p>현재 점수 ${formatNumber(state.gameSession.score.score)} · 콤보 ${state.gameSession.score.combo}</p>
        <div class="pause-actions">
          <button class="primary-action" type="button" data-action="resume-game">계속하기</button>
          <button class="secondary-action" type="button" data-action="restart-game">처음부터 다시</button>
          <button class="secondary-action" type="button" data-action="quit-game">플레이 종료</button>
        </div>
      </section>
    `);
  }

  function renderResult() {
    const score = state.result;
    root.innerHTML = sceneFrame('RESULT', `
      <section class="result-panel" aria-labelledby="result-title">
        <p class="ready-kicker">${score.failed ? 'FAILED' : 'COMPLETE'}</p>
        <h1 id="result-title">${formatNumber(score.score)}</h1>
        ${state.isNewBest ? '<p class="new-best">NEW BEST</p>' : ''}
        <div class="result-grid">
          <span>정확도 <strong>${(score.accuracy * 100).toFixed(2)}%</strong></span>
          <span>최대 콤보 <strong>${formatNumber(score.maxCombo)}</strong></span>
          <span>Perfect <strong>${score.judgements.perfect}</strong></span>
          <span>Great <strong>${score.judgements.great}</strong></span>
          <span>Good <strong>${score.judgements.good}</strong></span>
          <span>Miss <strong>${score.judgements.miss}</strong></span>
        </div>
        <div class="action-row">
          <button class="primary-action" type="button" data-action="retry-result">재도전</button>
          <button class="secondary-action" type="button" data-action="result-difficulties">난이도 선택</button>
        </div>
      </section>
    `);
  }

  function render() {
    const renderers = {
      BOOT: renderBoot,
      MENU: renderMenu,
      SETTINGS: renderSettings,
      DIFFICULTY_SELECT: renderDifficultySelect,
      LOADING: renderLoading,
      ERROR: renderError,
      READY: renderReady,
      VISUAL_PREVIEW: renderVisualPreview,
      PLAYING: renderPlaying,
      PAUSED: renderPaused,
      RESULT: renderResult,
    };
    renderers[scenes.current]();
  }

  function applyAudioSettings() {
    if (!state.audioSystem) return;
    state.audioSystem.setMasterVolume?.(state.settings.masterVolume);
    state.audioSystem.setMusicVolume?.(state.settings.musicMuted ? 0 : 1);
    state.audioSystem.setEffectVolume?.(state.settings.effectsMuted ? 0 : state.settings.effectVolume);
    state.audioSystem.clock?.setUserOffsetMs?.(state.settings.offsetMs);
  }

  function saveSettings() {
    repository?.saveSettings(state.settings);
    applyAudioSettings();
  }

  async function beginLoading() {
    state.audioSystem?.audioEngine.stop();
    state.previewState = 'idle';
    state.progress = { completed: 0, total: 1, percent: 0, current: '준비 중' };
    state.warnings = [];
    state.loadError = null;
    scenes.transitionTo('LOADING');
    render();

    try {
      state.resources = await loadResources({
        difficultyId: state.selectedDifficultyId,
        baseUrl,
        onProgress: updateProgress,
        onWarning: (warning) => state.warnings.push(warning),
      });
      if (state.audioSystem && state.resources.audioData) {
        await state.audioSystem.audioEngine.load('song', state.resources.audioData);
      }
      if (state.audioSystem && state.resources.optionalEffects) {
        for (const [effectKey, effectData] of Object.entries(state.resources.optionalEffects)) {
          if (effectData) await state.audioSystem.effects.load(effectKey, effectData);
        }
        state.audioSystem.effects.play('menuClick');
      }
      if (loadSkin) {
        state.skinBundle = await loadSkin({
          baseUrl,
          fetchImpl,
          onWarning: (warning) => state.warnings.push(warning),
        });
      }
      state.playbackState = 'stopped';
      scenes.transitionTo('READY');
    } catch (error) {
      state.loadError = error;
      scenes.transitionTo('ERROR');
    }
    render();
  }

  function stopVisualPreview() {
    if (state.animationFrameId !== null) {
      cancelFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    state.audioSystem?.audioEngine.stop();
    state.renderer = null;
  }

  function updateGameHud() {
    if (!state.gameSession || scenes.current !== 'PLAYING') return;
    const score = state.gameSession.score;
    const fields = {
      '[data-score]': score.score,
      '[data-combo]': score.combo > 0 ? score.combo : '',
      '[data-accuracy]': `${(score.accuracy * 100).toFixed(2)}%`,
      '[data-hp]': Math.round(score.hp),
    };
    for (const [selector, value] of Object.entries(fields)) {
      const element = root.querySelector(selector);
      if (element) element.textContent = String(value);
    }
    const judgement = root.querySelector('[data-judgement]');
    if (judgement && state.lastJudgement) {
      judgement.textContent = state.lastJudgement.toUpperCase();
      judgement.dataset.judgement = state.lastJudgement;
    }
  }

  function handleJudgementEvents(events) {
    for (const event of events) {
      state.lastJudgement = event.judgement;
      if (event.judgement !== 'miss') state.audioSystem.effects.play('hitNormal');
    }
    if (events.length) updateGameHud();
  }

  function stopGame() {
    if (state.animationFrameId !== null) {
      cancelFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    state.inputManager?.destroy();
    state.inputManager = null;
    state.audioSystem?.audioEngine.stop();
    state.renderer = null;
  }

  function clearGameRuntime({ stopAudio = false } = {}) {
    if (state.animationFrameId !== null) {
      cancelFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    state.inputManager?.destroy();
    state.inputManager = null;
    if (stopAudio) state.audioSystem.audioEngine.stop();
    state.renderer = null;
  }

  function finishGame() {
    const finalTime = state.audioSystem.clock.songTimeMs;
    handleJudgementEvents(state.gameSession.update(finalTime));
    clearGameRuntime({ stopAudio: true });
    state.result = { ...state.gameSession.score, difficultyId: state.selectedDifficultyId };
    state.isNewBest = repository?.saveBestResult(state.result) ?? false;
    scenes.transitionTo('RESULT');
    render();
  }

  function mountGameRuntime({ resume = false } = {}) {
    render();
    state.renderer = createRenderer(root.querySelector('.game-canvas'), {
      skin: state.skinBundle.skin,
      textures: state.skinBundle.textures,
      pixelRatio: globalThis.devicePixelRatio || 1,
    });
    state.renderer.setBeatmap(state.resources.beatmap);
    state.inputManager = createInputManager({
      keyBindings: state.settings.keyBindings,
      onPress: (lane) => handleJudgementEvents(state.gameSession.press(lane, state.audioSystem.clock.songTimeMs)),
      onRelease: (lane) => handleJudgementEvents(state.gameSession.release(lane, state.audioSystem.clock.songTimeMs)),
      onPause: () => pauseGame(),
    });
    state.inputManager.activate();
    if (resume) state.audioSystem.audioEngine.resume();
    else state.audioSystem.audioEngine.play('song', { offsetMs: 0 });

    const lastObject = state.resources.beatmap.hitObjects.at(-1);
    const finishTimeMs = Math.max(lastObject.startTimeMs, lastObject.endTimeMs ?? 0) + 1000;
    const gameFrame = () => {
      if (scenes.current !== 'PLAYING') return;
      const songTimeMs = state.audioSystem.clock.songTimeMs;
      handleJudgementEvents(state.gameSession.update(songTimeMs));
      if (state.gameSession.score.failed) {
        finishGame();
        return;
      }
      state.renderer.render({
        songTimeMs,
        pixelsPerMs: 0.45 * state.settings.scrollSpeed,
        pressedLanes: state.inputManager.pressedLanes,
        hiddenNoteIds: state.gameSession.finalizedNoteIds,
      });
      if (songTimeMs >= finishTimeMs) {
        finishGame();
        return;
      }
      state.animationFrameId = requestFrame(gameFrame);
    };
    state.animationFrameId = requestFrame(gameFrame);
  }

  function pauseGame() {
    if (scenes.current !== 'PLAYING') return;
    clearGameRuntime();
    state.audioSystem.audioEngine.pause();
    scenes.transitionTo('PAUSED');
    render();
  }

  function startGame() {
    scenes.transitionTo('PLAYING');
    state.lastJudgement = null;
    state.gameSession = createGameSession(state.resources.beatmap.hitObjects);
    mountGameRuntime();
  }

  function openVisualPreview() {
    scenes.transitionTo('VISUAL_PREVIEW');
    render();
    const canvas = root.querySelector('.game-canvas');
    state.renderer = createRenderer(canvas, {
      skin: state.skinBundle.skin,
      textures: state.skinBundle.textures,
      pixelRatio: globalThis.devicePixelRatio || 1,
    });
    state.renderer.setBeatmap(state.resources.beatmap);
    state.audioSystem.audioEngine.play('song', { offsetMs: 6000 });

    const drawFrame = () => {
      if (scenes.current !== 'VISUAL_PREVIEW') return;
      const stats = state.renderer.render({
        songTimeMs: state.audioSystem.clock.songTimeMs,
        pixelsPerMs: 0.45,
      });
      const output = root.querySelector('[data-render-stats]');
      if (output) output.textContent = `화면 노트 ${stats.visibleNotes} / 전체 ${formatNumber(stats.totalNotes)}`;
      state.animationFrameId = requestFrame(drawFrame);
    };
    state.animationFrameId = requestFrame(drawFrame);
  }

  async function startPreview() {
    if (!state.audioSystem) return;
    state.previewState = 'loading';
    state.previewError = null;
    render();

    try {
      if (!state.audioSystem.audioEngine.has?.('song')) {
        const response = await fetchImpl(resolveContentUrl(CONTENT.song.audioPath, baseUrl));
        if (!response.ok) throw new Error(`음원 요청 실패 (HTTP ${response.status})`);
        await state.audioSystem.audioEngine.load('song', await response.arrayBuffer());
      }
      state.audioSystem.audioEngine.playPreview('song', CONTENT.song.previewTimeMs, 15_000);
      state.previewState = 'playing';
    } catch (error) {
      state.previewState = 'idle';
      state.previewError = `미리듣기를 시작하지 못했습니다. ${error.message}`;
    }
    render();
  }

  root.addEventListener('click', async (event) => {
    const difficultyButton = event.target.closest('[data-difficulty-id]');
    if (difficultyButton && scenes.current === 'DIFFICULTY_SELECT') {
      state.selectedDifficultyId = difficultyButton.dataset.difficultyId;
      state.settings = { ...state.settings, lastDifficultyId: state.selectedDifficultyId };
      saveSettings();
      render();
      return;
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'start' && scenes.current === 'BOOT') {
      const button = event.target.closest('button');
      button.disabled = true;
      try {
        const context = await unlockAudio();
        state.audioSystem ??= createAudioSystem(context);
        applyAudioSettings();
        scenes.transitionTo('MENU');
      } catch (error) {
        state.bootError = `오디오를 활성화하지 못했습니다. ${error.message}`;
      }
      render();
    } else if (action === 'choose-difficulty' && scenes.current === 'MENU') {
      scenes.transitionTo('DIFFICULTY_SELECT');
      render();
    } else if (action === 'open-settings' && scenes.current === 'MENU') {
      scenes.transitionTo('SETTINGS');
      render();
    } else if (action === 'close-settings' && scenes.current === 'SETTINGS') {
      state.capturingLane = null;
      scenes.transitionTo('MENU');
      render();
    } else if (action === 'reset-settings' && scenes.current === 'SETTINGS') {
      state.settings = { ...DEFAULT_SETTINGS, keyBindings: [...DEFAULT_SETTINGS.keyBindings] };
      state.selectedDifficultyId = state.settings.lastDifficultyId;
      state.settingsError = null;
      saveSettings();
      render();
    } else if (action === 'back-to-menu' && scenes.current === 'DIFFICULTY_SELECT') {
      state.audioSystem?.audioEngine.stop();
      state.previewState = 'idle';
      scenes.transitionTo('MENU');
      render();
    } else if (action === 'preview' && scenes.current === 'DIFFICULTY_SELECT') {
      await startPreview();
    } else if (action === 'stop-preview' && scenes.current === 'DIFFICULTY_SELECT') {
      state.audioSystem?.audioEngine.stop();
      state.previewState = 'idle';
      render();
    } else if (action === 'load' && scenes.current === 'DIFFICULTY_SELECT') {
      await beginLoading();
    } else if (action === 'retry' && scenes.current === 'ERROR') {
      await beginLoading();
    } else if (action === 'back-to-difficulties' && ['ERROR', 'READY'].includes(scenes.current)) {
      state.audioSystem?.audioEngine.stop();
      state.playbackState = 'stopped';
      scenes.transitionTo('DIFFICULTY_SELECT');
      render();
    } else if (action === 'open-visual-preview' && scenes.current === 'READY') {
      openVisualPreview();
    } else if (action === 'close-visual-preview' && scenes.current === 'VISUAL_PREVIEW') {
      stopVisualPreview();
      scenes.transitionTo('READY');
      render();
    } else if (action === 'start-game' && scenes.current === 'READY') {
      startGame();
    } else if (action === 'exit-game' && scenes.current === 'PLAYING') {
      stopGame();
      scenes.transitionTo('READY');
      render();
    } else if (action === 'resume-game' && scenes.current === 'PAUSED') {
      scenes.transitionTo('PLAYING');
      mountGameRuntime({ resume: true });
    } else if (action === 'restart-game' && scenes.current === 'PAUSED') {
      state.audioSystem.audioEngine.stop();
      state.gameSession = createGameSession(state.resources.beatmap.hitObjects);
      state.lastJudgement = null;
      scenes.transitionTo('PLAYING');
      mountGameRuntime();
    } else if (action === 'quit-game' && scenes.current === 'PAUSED') {
      state.audioSystem.audioEngine.stop();
      scenes.transitionTo('READY');
      render();
    } else if (action === 'retry-result' && scenes.current === 'RESULT') {
      scenes.transitionTo('READY');
      startGame();
    } else if (action === 'result-difficulties' && scenes.current === 'RESULT') {
      scenes.transitionTo('DIFFICULTY_SELECT');
      render();
    } else if (action === 'play-song' && scenes.current === 'READY') {
      state.audioSystem?.audioEngine.play('song', { offsetMs: 0 });
      state.playbackState = 'playing';
      render();
    } else if (action === 'resume-song' && scenes.current === 'READY') {
      try {
        state.audioSystem?.audioEngine.resume();
        state.playbackState = 'playing';
      } catch {
        state.playbackState = '재개할 일시정지 위치 없음';
      }
      render();
    }
  });

  root.addEventListener('click', (event) => {
    const keyButton = event.target.closest('[data-key-lane]');
    if (!keyButton || scenes.current !== 'SETTINGS') return;
    state.capturingLane = Number(keyButton.dataset.keyLane);
    state.settingsError = null;
    render();
    root.querySelector(`[data-key-lane="${state.capturingLane}"]`)?.focus();
  });

  root.addEventListener('keydown', (event) => {
    if (scenes.current !== 'SETTINGS' || state.capturingLane === null || event.repeat) return;
    event.preventDefault();
    if (state.settings.keyBindings.includes(event.code)) {
      state.settingsError = '이미 다른 레인에서 사용하는 키입니다.';
    } else {
      const keyBindings = [...state.settings.keyBindings];
      keyBindings[state.capturingLane] = event.code;
      state.settings = { ...state.settings, keyBindings };
      state.settingsError = null;
      saveSettings();
    }
    state.capturingLane = null;
    render();
  });

  root.addEventListener('input', (event) => {
    const key = event.target.dataset.setting;
    if (!key || !['SETTINGS', 'READY'].includes(scenes.current)) return;
    const value = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
    state.settings = { ...state.settings, [key]: value };
    saveSettings();
    render();
  });

  render();
  return { get scene() { return scenes.current; } };
}
