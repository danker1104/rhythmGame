// @ts-check

import { AudioEngine } from '../audio/audioEngine.js';
import { UiSoundController } from '../audio/uiSoundController.js';
import { decodeBeatmapText } from '../beatmap/beatmapAdapter.js';
import { loadCatalog, loadManifest } from '../catalog/catalogLoader.js';
import { resolvePublicAsset } from '../catalog/urlResolver.js';
import { ObjectScheduler } from '../engine/objectScheduler.js';
import { FrameCoordinator } from '../engine/frameCoordinator.js';
import { CoordinateMapper } from '../input/coordinateMapper.js';
import { InputManager } from '../input/inputManager.js';
import { PlayfieldRenderer } from '../renderer/playfieldRenderer.js';
import { hudAccuracy } from '../renderer/gameplayHud.js';
import { approachRateToPreempt, circleSizeToRadius, getHitWindows } from '../rules/standardRules.js';
import { GameplayState } from '../rules/gameplayState.js';
import { calculateDifficultyMultiplier, calculateDrainTimeSeconds } from '../rules/scoreV1.js';
import { SkinManager } from '../skin/skinManager.js';
import { buildStandardSkinPlan, skinAssetsForGroups } from '../skin/standardSkinAssets.js';
import { decodeStoryboardText, storyboardImagePaths } from '../storyboard/storyboardAdapter.js';
import { StoryboardSampleScheduler } from '../storyboard/storyboardSampleScheduler.js';
import { SceneMachine } from './sceneMachine.js';
import { DEFAULT_SETTINGS, LocalRepository } from '../storage/localRepository.js';
import { RULESET_VERSION } from '../rules/standardRules.js';
import { FrameMetrics } from '../performance/frameMetrics.js';
import { formatJudgementDiagnostic, JudgementDiagnostics } from '../performance/judgementDiagnostics.js';
import { sessionOutcome } from '../performance/profilePolicy.js';
import { LoadGeneration } from './loadGeneration.js';
import { hitSoundRequests, sampleContextAt } from '../audio/hitSoundFeedback.js';
import { SliderSoundController } from '../audio/sliderSoundController.js';
import { SpinnerSoundController } from '../audio/spinnerSoundController.js';
import { HitSoundResolver } from '../audio/hitsoundResolver.js';
import { createHitFeedback } from '../renderer/hitFeedback.js';
import { decorateHitObjects } from '../renderer/hitObjectVisuals.js';
import { completionSoundCandidates, resultRankFromTitle, sceneSkinPresentation } from '../skin/sceneSkinPresentation.js';
import { buildDifficultyItems, carouselOffset, moveDifficultySelection, previewLabel } from '../ui/songSelectPresentation.js';
import { buildResultPresentation } from '../ui/resultPresentation.js';

export class CircleSliceApp {
  /** @param {{canvas:HTMLCanvasElement,select:HTMLSelectElement,startButton:HTMLButtonElement,status:HTMLElement,menuPanel:HTMLElement,stats:HTMLElement,dialog:HTMLDialogElement}} elements */
  constructor(elements) {
    this.elements = elements;
    this.baseUrl = import.meta.env.BASE_URL;
    this.fetcher = window.fetch.bind(window);
    this.catalog = null;
    this.song = null;
    this.skinCatalogEntry = null;
    this.rafId = 0;
    this.playing = false;
    this.judgementCount = 0;
    this.scene = new SceneMachine();
    let storage;
    try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => {} }; }
    this.repository = new LocalRepository(storage);
    this.settings = this.repository.loadSettings();
    this.difficultyModels = new Map();
    this.session = null;
    this.loadedSession = null;
    this.loading = new LoadGeneration();
    this.debugHud = document.getElementById('debug-hud');
    this.debugEnabled = new URL(window.location.href).searchParams.get('debug') === '1';
    this.profileMode = this.debugEnabled && new URL(window.location.href).searchParams.get('profile') === '1';
    this.previewPlaying = false;
    this.previewGeneration = 0;
    if (this.debugHud) this.debugHud.hidden = !(this.debugEnabled || this.settings.fpsEnabled);
    this.audio = new AudioEngine(
      () => new AudioContext(),
      this.fetcher,
      (reason) => this.pause(reason, true),
    );
    this.uiSounds = new UiSoundController(this.audio, () => this.loadUiSounds());
  }

  async initialize() {
    if (this.scene.current === 'BOOT') {
      this.transitionTo('CONSENT');
      this.transitionTo('CATALOG');
    } else if (this.scene.current !== 'CATALOG') throw new Error(`INITIALIZE_SCENE_INVALID: ${this.scene.current}`);
    this.setStatus('카탈로그를 불러오는 중…');
    this.catalog = await loadCatalog(this.fetcher, this.baseUrl);
    this.song = this.catalog.songs[0];
    this.skinCatalogEntry = this.catalog.skins.find((/** @type {any} */ skin) => skin.id === this.catalog.defaultSkinId);
    this.skinUi = {
      skinUrl: (/** @type {string} */ name) => resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, name),
      mapFailureUrl: null,
    };
    this.applySelectionSkin();
    for (const difficulty of this.song.difficulties) {
      const option = document.createElement('option');
      option.value = difficulty.id;
      option.textContent = `${difficulty.label} · ${difficulty.beatmapId}`;
      this.elements.select.append(option);
    }
    const selected = this.song.difficulties.find((/** @type {any} */ difficulty) => difficulty.beatmapId === this.settings.lastBeatmapId);
    if (selected) this.elements.select.value = selected.id;
    this.transitionTo('DIFFICULTY_SELECT');
    this.bindUi();
    await this.loadDifficultyModels();
    this.updateDifficultyStats();
    this.renderDifficultyRail();
    this.elements.startButton.disabled = false;
    this.elements.startButton.textContent = 'Standard 플레이 시작';
    this.elements.startButton.onclick = () => { void this.start(); };
    const previewButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('preview-button'));
    if (previewButton) previewButton.disabled = false;
    this.setStatus('Circle, Slider, Spinner를 지원하는 Standard 개발 플레이입니다.');
  }

  async start() {
    if (this.playing) return;
    if (this.scene.current !== 'DIFFICULTY_SELECT') return;
    void this.uiSounds.play('menuclick.wav');
    this.stopPreview(true);
    this.transitionTo('LOADING');
    const load = this.loading.begin();
    const fetchForLoad = (/** @type {string|URL|Request} */ url) => this.fetcher(url, { signal: load.signal });
    const assertCurrent = () => {
      if (!this.loading.isCurrent(load.id)) throw new globalThis.DOMException('Stale content load', 'AbortError');
    };
    this.elements.startButton.disabled = true;
    this.setStatus('오디오 권한을 확인하고 실제 콘텐츠를 로딩 중…');
    try {
      await this.audio.unlockFromGesture();
      const difficulty = this.song.difficulties.find((/** @type {any} */ entry) => entry.id === this.elements.select.value) ?? this.song.difficulties[0];
      const contentManifestUrl = resolvePublicAsset(this.baseUrl, this.song.root, this.song.manifest);
      const skinManifestUrl = resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, this.skinCatalogEntry.manifest);
      const [contentManifest, skinManifest, skinConfigResponse, beatmapResponse, storyboardResponse] = await Promise.all([
        loadManifest(fetchForLoad, contentManifestUrl),
        loadManifest(fetchForLoad, skinManifestUrl),
        fetchForLoad(resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, this.skinCatalogEntry.config)),
        fetchForLoad(resolvePublicAsset(this.baseUrl, this.song.root, difficulty.file)),
        fetchForLoad(resolvePublicAsset(this.baseUrl, this.song.root, this.song.storyboard)),
      ]);
      assertCurrent();
      if (!beatmapResponse.ok) throw new Error(`BEATMAP_FETCH_FAILED: ${beatmapResponse.status}`);
      if (!skinConfigResponse.ok) throw new Error(`SKIN_CONFIG_FETCH_FAILED: ${skinConfigResponse.status}`);
      const beatmapText = await beatmapResponse.text();
      const beatmap = decodeBeatmapText(beatmapText);
      this.settings = this.repository.saveSettings({ ...this.settings, lastSongId: this.song.id, lastBeatmapId: beatmap.beatmapId });
      let storyboard = null;
      if (storyboardResponse.ok) {
        try {
          storyboard = decodeStoryboardText(beatmapText, await storyboardResponse.text());
          for (const diagnostic of storyboard.diagnostics) console.warn(diagnostic);
        }
        catch (error) { console.warn('STORYBOARD_DECODE_SKIPPED', error); }
      } else console.warn(`STORYBOARD_FETCH_SKIPPED: ${storyboardResponse.status}`);
      const audioEntry = contentManifest.files.find((/** @type {any} */ entry) => entry.path === this.song.audio);
      if (!audioEntry) throw new Error('AUDIO_MANIFEST_ENTRY_MISSING');
      const audioHandle = await this.audio.loadAudio(
        resolvePublicAsset(this.baseUrl, this.song.root, this.song.audio),
        audioEntry,
      );
      assertCurrent();
      if (audioHandle.kind !== 'buffer') throw new Error('AUDIO_REQUIRED_SILENT');

      const skin = new SkinManager(this.fetcher);
      const skinConfig = skin.configure(await skinConfigResponse.text());
      const skinPlan = buildStandardSkinPlan(skinManifest, skinConfig, { highResolution: window.devicePixelRatio > 1 });
      skin.configureRoles(skinPlan.roles);
      skin.diagnostics.push(...skinPlan.diagnostics);
      for (const diagnostic of skin.diagnostics) console.info('SKIN_DIAGNOSTIC', diagnostic);
      const initialSkinImages = skinAssetsForGroups(skinPlan, Object.keys(skinPlan.groups));
      await skin.loadPlannedImages(
        initialSkinImages,
        new Set(skinPlan.required),
        (name) => resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, name),
      );
      for (const diagnostic of skin.diagnostics.slice(skinConfig.warnings.length + skinPlan.diagnostics.length)) console.info('SKIN_DIAGNOSTIC', diagnostic);
      await skin.loadImage('background', resolvePublicAsset(this.baseUrl, this.song.root, this.song.background));
      this.skinUi = {
        skinUrl: (/** @type {string} */ name) => resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, name),
        mapFailureUrl: contentManifest.files.some((/** @type {any} */ entry) => entry.path === 'fail-background.png')
          ? resolvePublicAsset(this.baseUrl, this.song.root, 'fail-background.png') : null,
        mapBackgroundUrl: resolvePublicAsset(this.baseUrl, this.song.root, this.song.background),
      };
      this.applySelectionSkin();
      const [effects, storyboardResources] = await Promise.all([
        this.loadStage6Effects(contentManifest, skinManifest),
        this.loadStoryboardResources(storyboard, contentManifest, skin),
      ]);
      assertCurrent();

      this.loadedSession = { beatmap, audioBuffer: audioHandle.buffer, skin, skinPlan, effects, storyboard, storyboardResources };
      this.transitionTo('READY');
      this.beginGameplay(beatmap, audioHandle.buffer, skin, effects, storyboard, storyboardResources);
    } catch (error) {
      if (!this.loading.isCurrent(load.id)) return;
      this.transitionTo('DIFFICULTY_SELECT');
      this.elements.startButton.disabled = false;
      this.setStatus(`시작 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  bindUi() {
    const byId = (/** @type {string} */ id) => document.getElementById(id);
    const ranges = {
      offsetMs: /** @type {HTMLInputElement} */ (byId('offset-setting')),
      masterVolume: /** @type {HTMLInputElement} */ (byId('master-volume')),
      musicVolume: /** @type {HTMLInputElement} */ (byId('music-volume')),
      effectVolume: /** @type {HTMLInputElement} */ (byId('effect-volume')),
      storyboardVolume: /** @type {HTMLInputElement} */ (byId('story-volume')),
      backgroundDim: /** @type {HTMLInputElement} */ (byId('background-dim')),
      cursorScale: /** @type {HTMLInputElement} */ (byId('cursor-scale')),
    };
    this.settingControls = ranges;
    const storyboard = /** @type {HTMLInputElement} */ (byId('storyboard-enabled'));
    const cursorTrail = /** @type {HTMLInputElement} */ (byId('cursor-trail'));
    const hudDetail = /** @type {HTMLInputElement} */ (byId('hud-detail-enabled'));
    const inputOverlay = /** @type {HTMLInputElement} */ (byId('input-overlay-enabled'));
    const fps = /** @type {HTMLInputElement} */ (byId('fps-enabled'));
    const keyLeft = /** @type {HTMLInputElement} */ (byId('key-left'));
    const keyRight = /** @type {HTMLInputElement} */ (byId('key-right'));
    this.storyboardControl = storyboard;
    const sync = () => {
      for (const [key, input] of Object.entries(ranges)) input.value = String(/** @type {Record<string,any>} */ (this.settings)[key]);
      storyboard.checked = this.settings.storyboardEnabled;
      cursorTrail.checked = this.settings.cursorTrail;
      hudDetail.checked = this.settings.hudDetailEnabled;
      inputOverlay.checked = this.settings.inputOverlayEnabled;
      fps.checked = this.settings.fpsEnabled;
      keyLeft.value = this.settings.keyBindings[0].replace(/^Key/, ''); keyRight.value = this.settings.keyBindings[1].replace(/^Key/, '');
      const output = byId('offset-output'); if (output) output.textContent = `${this.settings.offsetMs}ms`;
      for (const [id, value] of [['master-output', this.settings.masterVolume], ['music-output', this.settings.musicVolume], ['effect-output', this.settings.effectVolume], ['story-output', this.settings.storyboardVolume], ['dim-output', this.settings.backgroundDim], ['cursor-output', this.settings.cursorScale]]) {
        const valueOutput = byId(String(id)); if (valueOutput) valueOutput.textContent = `${Math.round(Number(value) * 100)}%`;
      }
    };
    this.syncSettingsUi = sync;
    sync();
    for (const [key, input] of Object.entries(ranges)) input.addEventListener('input', () => {
      this.settings = this.repository.saveSettings({ ...this.settings, [key]: Number(input.value) });
      sync(); this.applyLiveSettings();
    });
    storyboard.addEventListener('change', () => { this.settings = this.repository.saveSettings({ ...this.settings, storyboardEnabled: storyboard.checked }); });
    cursorTrail.addEventListener('change', () => { this.settings = this.repository.saveSettings({ ...this.settings, cursorTrail: cursorTrail.checked }); this.applyLiveSettings(); });
    hudDetail.addEventListener('change', () => { this.settings = this.repository.saveSettings({ ...this.settings, hudDetailEnabled: hudDetail.checked }); this.applyLiveSettings(); });
    inputOverlay.addEventListener('change', () => { this.settings = this.repository.saveSettings({ ...this.settings, inputOverlayEnabled: inputOverlay.checked }); this.applyLiveSettings(); });
    fps.addEventListener('change', () => { this.settings = this.repository.saveSettings({ ...this.settings, fpsEnabled: fps.checked }); this.applyLiveSettings(); });
    /** @param {HTMLInputElement} input @param {number} index */
    const bindKey = (input, index) => input.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
      event.preventDefault();
      if (!event.code || event.code === this.settings.keyBindings[1 - index]) { this.setStatus('두 입력 키는 서로 달라야 합니다.'); sync(); return; }
      const bindings = /** @type {[string,string]} */ ([...this.settings.keyBindings]); bindings[index] = event.code;
      this.settings = this.repository.saveSettings({ ...this.settings, keyBindings: bindings }); sync();
    });
    bindKey(keyLeft, 0); bindKey(keyRight, 1);
    byId('reset-settings')?.addEventListener('click', () => { this.settings = this.repository.saveSettings(DEFAULT_SETTINGS); sync(); this.applyLiveSettings(); });
    byId('fullscreen-button')?.addEventListener('click', async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
      catch { this.setStatus('이 브라우저에서는 전체 화면을 시작할 수 없습니다.'); }
    });
    byId('resume-button')?.addEventListener('click', () => this.resume());
    byId('restart-button')?.addEventListener('click', () => { void this.uiSounds.play('menuclick.wav'); this.restart(); });
    byId('select-button')?.addEventListener('click', () => { void this.uiSounds.play('menuback.wav'); this.returnToSelection(); });
    byId('preview-button')?.addEventListener('click', () => { void this.uiSounds.play('menuclick.wav'); void this.togglePreview(); });
    byId('difficulty-toggle')?.addEventListener('click', () => {
      const toggle = /** @type {HTMLButtonElement} */ (byId('difficulty-toggle'));
      const region = /** @type {HTMLElement} */ (byId('difficulty-region'));
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      void this.uiSounds.play(expanded ? 'menuback.wav' : 'menuclick.wav');
      toggle.setAttribute('aria-expanded', String(!expanded));
      region.hidden = expanded;
    });
    byId('settings-panel')?.addEventListener('toggle', () => { void this.uiSounds.play('menuclick.wav'); });
    const moveSelection = (/** @type {number} */ direction) => {
      void this.uiSounds.play('menuhit.wav');
      this.selectDifficulty(moveDifficultySelection(this.song.difficulties, this.elements.select.value, direction), true);
    };
    byId('difficulty-previous')?.addEventListener('click', () => moveSelection(-1));
    byId('difficulty-next')?.addEventListener('click', () => moveSelection(1));
    byId('difficulty-rail')?.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const id = moveDifficultySelection(this.song.difficulties, this.elements.select.value, event.key === 'ArrowRight' ? 1 : -1);
      this.selectDifficulty(id, true);
    });
    byId('difficulty-rail')?.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) < 4 && Math.abs(event.deltaX) < 4) return;
      event.preventDefault();
      const direction = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      this.selectDifficulty(moveDifficultySelection(this.song.difficulties, this.elements.select.value, direction), true);
    }, { passive: false });
    this.elements.select.addEventListener('change', () => {
      this.updateDifficultyStats();
      this.renderDifficultyRail();
      if (this.scene.current !== 'LOADING') return;
      this.loading.cancel();
      this.transitionTo('DIFFICULTY_SELECT');
      this.elements.startButton.disabled = false;
      this.setStatus('난이도가 변경되어 이전 로딩을 취소했습니다. 다시 시작해 주세요.');
    });
    window.addEventListener('keydown', (event) => { if (event.code === 'Escape' && this.playing) { event.preventDefault(); this.pause('사용자 요청'); } });
  }

  async loadDifficultyModels() {
    await Promise.all(this.song.difficulties.map(async (/** @type {any} */ difficulty) => {
      try {
        const response = await this.fetcher(resolvePublicAsset(this.baseUrl, this.song.root, difficulty.file));
        if (response.ok) this.difficultyModels.set(difficulty.id, decodeBeatmapText(await response.text()));
      } catch { /* selection remains usable without optional summary */ }
    }));
  }

  updateDifficultyStats() {
    const model = this.difficultyModels.get(this.elements.select.value);
    if (!model) { this.elements.stats.textContent = ''; return; }
    const values = [['HP', model.hpDrainRate], ['CS', model.circleSize], ['OD', model.overallDifficulty], ['AR', model.approachRate], ['Circle', model.statistics.circles], ['Slider', model.statistics.sliders], ['Spinner', model.statistics.spinners], ['Total', model.statistics.total]];
    this.elements.stats.replaceChildren(...values.map(([label, value]) => {
      const wrapper = document.createElement('div'); const term = document.createElement('dt'); const detail = document.createElement('dd');
      term.textContent = String(label); detail.textContent = String(value); wrapper.append(term, detail); return wrapper;
    }));
    const selectedName = document.getElementById('selected-difficulty-name');
    const difficulty = this.song?.difficulties.find((/** @type {any} */ entry) => entry.id === this.elements.select.value);
    if (selectedName && difficulty) selectedName.textContent = difficulty.label.toUpperCase();
  }

  renderDifficultyRail() {
    const rail = document.getElementById('difficulty-rail');
    if (!rail || !this.song) return;
    const items = buildDifficultyItems(this.song, this.difficultyModels, this.elements.select.value);
    const existing = new Map([...rail.querySelectorAll('.difficulty-card')].map((button) => [/** @type {HTMLElement} */ (button).dataset.difficultyId, button]));
    for (const item of items) {
      let button = /** @type {HTMLButtonElement|undefined} */ (existing.get(item.id));
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'difficulty-card';
        button.dataset.difficultyId = item.id;
        button.addEventListener('click', () => { void this.uiSounds.play('menuhit.wav'); this.selectDifficulty(item.id); });
      }
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(item.selected));
      button.disabled = !item.ready;
      const offset = carouselOffset(this.song.difficulties, this.elements.select.value, item.id);
      button.style.setProperty('--offset', String(offset));
      button.style.setProperty('--distance', String(Math.abs(offset)));
      button.style.setProperty('--difficulty-art', `url("${this.skinUi?.skinUrl('mode-osu-small.png') ?? ''}")`);
      button.tabIndex = item.selected ? 0 : -1;
      const title = document.createElement('strong'); title.textContent = item.label;
      const id = document.createElement('small'); id.textContent = `Beatmap ${item.beatmapId}`;
      const stats = document.createElement('span');
      stats.textContent = item.ready ? `AR ${item.ar} · OD ${item.od} · ${item.total} objects` : '불러오는 중…';
      button.replaceChildren(title, id, stats);
      rail.append(button);
      existing.delete(item.id);
    }
    for (const stale of existing.values()) stale.remove();
  }

  /** @param {string} id @param {boolean} [focus] */
  selectDifficulty(id, focus = false) {
    if (!this.song.difficulties.some((/** @type {any} */ difficulty) => difficulty.id === id)) return;
    this.elements.select.value = id;
    this.elements.select.dispatchEvent(new window.Event('change'));
    if (focus) /** @type {HTMLElement|null} */ (document.querySelector(`[data-difficulty-id="${id}"]`))?.focus();
  }

  async togglePreview() {
    if (this.scene.current !== 'DIFFICULTY_SELECT') return;
    if (this.previewPlaying) { this.stopPreview(); return; }
    const generation = ++this.previewGeneration;
    const button = /** @type {HTMLButtonElement|null} */ (document.getElementById('preview-button'));
    if (button) { button.disabled = true; button.textContent = '미리듣기 로딩…'; }
    try {
      await this.audio.unlockFromGesture();
      const manifest = await loadManifest(this.fetcher, resolvePublicAsset(this.baseUrl, this.song.root, this.song.manifest));
      const entry = manifest.files.find((/** @type {any} */ file) => file.path === this.song.audio);
      if (!entry) throw new Error('AUDIO_MANIFEST_ENTRY_MISSING');
      const handle = await this.audio.loadAudio(resolvePublicAsset(this.baseUrl, this.song.root, this.song.audio), entry);
      if (generation !== this.previewGeneration || handle.kind !== 'buffer') return;
      this.audio.setVolumes({ master: this.settings.masterVolume, music: this.settings.musicVolume, effect: this.settings.effectVolume, storyboard: this.settings.storyboardVolume });
      this.audio.playMusic(handle.buffer, this.song.previewTimeMs, 220);
      this.previewPlaying = true;
      this.updatePreviewButton();
      this.setStatus(`${(this.song.previewTimeMs / 1000).toFixed(3)}초부터 미리듣는 중입니다.`);
    } catch (error) {
      if (generation !== this.previewGeneration) return;
      this.setStatus(`미리듣기 실패: ${error instanceof Error ? error.message : String(error)}`);
      this.previewPlaying = false;
      this.updatePreviewButton();
    }
  }

  /** @param {boolean} [immediate] */
  stopPreview(immediate = false) {
    const generation = ++this.previewGeneration;
    if (this.previewPlaying && this.audio.context?.state === 'running' && this.audio.clock?.running) {
      if (immediate) this.audio.pause();
      else {
        this.audio.fadeMusicTo(0, 180);
        window.setTimeout(() => {
          if (generation !== this.previewGeneration || !this.audio.clock?.running) return;
          this.audio.pause();
          this.audio.setVolumes({ music: this.settings.musicVolume });
        }, 190);
      }
    }
    this.previewPlaying = false;
    this.updatePreviewButton();
  }

  updatePreviewButton() {
    const button = /** @type {HTMLButtonElement|null} */ (document.getElementById('preview-button'));
    if (!button) return;
    button.disabled = false;
    button.textContent = previewLabel(this.previewPlaying);
    button.setAttribute('aria-pressed', String(this.previewPlaying));
  }

  applyLiveSettings() {
    if (this.audio.context) this.audio.setVolumes({ master: this.settings.masterVolume, music: this.settings.musicVolume, effect: this.settings.effectVolume, storyboard: this.settings.storyboardVolume });
    if (this.audio.clock) this.audio.clock.setOffset(this.settings.offsetMs);
    this.session?.renderer.setVisualSettings(this.settings);
    if (this.debugHud) this.debugHud.hidden = !(this.debugEnabled || this.settings.fpsEnabled);
  }

  async loadUiSounds() {
    if (!this.skinCatalogEntry) return new Map();
    const manifest = await loadManifest(this.fetcher, resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, this.skinCatalogEntry.manifest));
    const names = new Set(['menuhit.wav', 'menuclick.wav', 'menuback.wav', 'whoosh.wav']);
    const handles = new Map();
    await Promise.all(manifest.files.filter((/** @type {any} */ entry) => names.has(entry.path)).map(async (/** @type {any} */ entry) => {
      handles.set(entry.path, await this.audio.loadAudio(resolvePublicAsset(this.baseUrl, this.skinCatalogEntry.root, entry.path), entry));
    }));
    return handles;
  }

  /** @param {any} contentManifest @param {any} skinManifest */
  async loadStage6Effects(contentManifest, skinManifest) {
    /** @type {Map<string, any>} */
    const beatmap = new Map();
    /** @type {Map<string, any>} */
    const skin = new Map();
    /** @param {any} manifest @param {string} root @param {Map<string,any>} target @param {boolean} [excludeMusic] */
    const loadScope = async (manifest, root, target, excludeMusic = false) => Promise.all(
      manifest.files.filter((/** @type {any} */ entry) => entry.role === 'audio' && (!excludeMusic || entry.path !== this.song.audio)).map(async (/** @type {any} */ entry) => {
        const handle = await this.audio.loadAudio(resolvePublicAsset(this.baseUrl, root, entry.path), entry);
        target.set(entry.path, handle);
      }),
    );
    await Promise.all([
      loadScope(contentManifest, this.song.root, beatmap, true),
      loadScope(skinManifest, this.skinCatalogEntry.root, skin),
    ]);
    return new HitSoundResolver(beatmap, skin);
  }

  /** @param {any|null} storyboard @param {any} contentManifest @param {SkinManager} loader */
  async loadStoryboardResources(storyboard, contentManifest, loader) {
    /** @type {Map<string,CanvasImageSource>} */
    const images = new Map();
    /** @type {Map<string,AudioBuffer>} */
    const samples = new Map();
    if (!storyboard) return { images, samples };
    await Promise.all(storyboardImagePaths(storyboard).map(async (path) => {
      const entry = contentManifest.files.find((/** @type {any} */ file) => file.path === path);
      if (!entry) { console.warn(`STORYBOARD_IMAGE_MISSING: ${path}`); return; }
      try {
        const image = await loader.loadImage(`storyboard:${path}`, resolvePublicAsset(this.baseUrl, this.song.root, path));
        if (image) images.set(path, image);
      } catch (error) { console.warn(`STORYBOARD_IMAGE_SKIPPED: ${path}`, error); }
    }));
    await Promise.all(storyboard.samples.map(async (/** @type {any} */ sample) => {
      const entry = contentManifest.files.find((/** @type {any} */ file) => file.path === sample.path);
      if (!entry) { console.warn(`STORYBOARD_SAMPLE_MISSING: ${sample.path}`); return; }
      try {
        const handle = await this.audio.loadAudio(resolvePublicAsset(this.baseUrl, this.song.root, sample.path), entry);
        if (handle.kind === 'buffer') samples.set(sample.path, handle.buffer);
      } catch (error) { console.warn(`STORYBOARD_SAMPLE_SKIPPED: ${sample.path}`, error); }
    }));
    return { images, samples };
  }

  /** @param {any} beatmap @param {AudioBuffer} audioBuffer @param {SkinManager} skin @param {HitSoundResolver} effects @param {any|null} storyboard @param {{images:Map<string,CanvasImageSource>,samples:Map<string,AudioBuffer>}} storyboardResources */
  beginGameplay(beatmap, audioBuffer, skin, effects, storyboard, storyboardResources) {
    const canvas = this.elements.canvas;
    const context = canvas.getContext('2d');
    if (!context || !this.audio.clock) throw new Error('GAMEPLAY_CONTEXT_UNAVAILABLE');
    const mapper = new CoordinateMapper(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    mapper.resizeCanvas(canvas, context);
    const resize = () => mapper.resizeToViewport(window, canvas, context);
    window.addEventListener('resize', resize);
    const radius = circleSizeToRadius(beatmap.circleSize);
    const objects = decorateHitObjects(
      beatmap.hitObjects.map((/** @type {any} */ object) => ({ ...object, radius })),
      skin.config.colours.comboColours,
    );
    const windows = getHitWindows(beatmap.overallDifficulty);
    const diagnostics = new JudgementDiagnostics();
    const scheduler = new ObjectScheduler(objects, windows, (entry) => diagnostics.record(entry));
    const feedbackObjects = new Map([
      ...scheduler.circles.circles,
      ...scheduler.sliders,
      ...scheduler.spinners.map((spinner) => spinner.runtime),
    ].map((object) => [object.id, object]));
    const drainTimeSeconds = calculateDrainTimeSeconds(beatmap);
    const drainStartTimeMs = beatmap.statistics.firstStartTimeMs;
    const drainEndTimeMs = Math.max(drainStartTimeMs, ...beatmap.hitObjects.map((/** @type {any} */ object) => object.endTimeMs));
    const gameplay = new GameplayState({
      hpDrainRate: beatmap.hpDrainRate,
      difficultyMultiplier: calculateDifficultyMultiplier({
        hp: beatmap.hpDrainRate,
        cs: beatmap.circleSize,
        od: beatmap.overallDifficulty,
        objectCount: beatmap.statistics.total,
        drainTimeSeconds,
      }),
    });
    const preemptMs = approachRateToPreempt(beatmap.approachRate);
    const frameMetrics = new FrameMetrics();
    /** @type {number|null} */
    let lastRafTime = null;
    let lastRenderMetrics = { drawCalls: 0, activeStoryboardCount: 0, activeHitObjects: 0 };
    let lastPendingInputCount = 0;
    /** @type {number|null} */
    let lastTimingErrorMs = null;
    const renderer = new PlayfieldRenderer(context, mapper, skin);
    renderer.setHitObjects(objects);
    renderer.setBackground(skin.get('background'));
    renderer.setVisualSettings(this.settings);
    if (storyboard && this.settings.storyboardEnabled) renderer.setStoryboard(storyboard, storyboardResources.images);
    const storyboardSamples = storyboard && this.settings.storyboardEnabled
      ? new StoryboardSampleScheduler(this.audio, storyboard.samples, storyboardResources.samples)
      : null;
    this.storyboardSamples = storyboardSamples;
    const sliderSounds = new SliderSoundController(this.audio, effects);
    const spinnerSounds = new SpinnerSoundController(this.audio, effects);
    const input = new InputManager({
      clock: this.audio.clock,
      mapper,
      requestPause: (reason) => this.pause(reason),
      onMetric: (name) => diagnostics.increment(name),
      keyBindings: /** @type {[string,string]} */ (this.settings.keyBindings),
    });
    input.attach(canvas, window, document);
    input.setActive(true);
    this.input = input;
    this.playing = true;
    this.audio.clock.setOffset(this.settings.offsetMs);
    this.audio.setVolumes({ master: this.settings.masterVolume, music: this.settings.musicVolume, effect: this.settings.effectVolume, storyboard: this.settings.storyboardVolume });
    this.judgementCount = 0;
    this.transitionTo('PLAYING');
    document.body.classList.add('is-playing', 'is-gameflow');

    /** @param {number} previousTimeMs @param {number} currentTimeMs */
    const advance = (previousTimeMs, currentTimeMs) => {
      storyboardSamples?.update(currentTimeMs);
      const transitions = input.state.drainTransitions();
      lastPendingInputCount = transitions.length;
      const scheduledEvents = scheduler.advance(previousTimeMs, currentTimeMs, input.state.isHolding, input.playfieldPosition, transitions);
      const events = gameplay.processFrame({
        previousTimeMs,
        currentTimeMs,
        drainStartTimeMs,
        drainEndTimeMs,
        breaks: beatmap.breaks,
        events: scheduledEvents,
        onApplied: (event, before, after) => {
          const object = feedbackObjects.get(event.objectId);
          const mapTimeMs = Number.isFinite(event.mapTimeMs) ? event.mapTimeMs : currentTimeMs;
          diagnostics.record({
            event: 'judgement_applied',
            mapTimeMs,
            rawAudioTimeMs: mapTimeMs - this.settings.offsetMs,
            objectId: event.objectId ?? null,
            objectKind: object?.kind ?? event.type,
            result: event.judgement ?? event.result ?? event.type,
            before,
            after,
          });
        },
      });
      sliderSounds.update(scheduler.sliders, input.state.isHolding, currentTimeMs);
      spinnerSounds.update(scheduler.spinners.map((spinner) => spinner.runtime), input.state.isHolding, currentTimeMs);
      for (const event of events) {
        if (Number.isFinite(event.hitErrorMs)) lastTimingErrorMs = event.hitErrorMs;
        const object = feedbackObjects.get(event.objectId);
        renderer.pushHitFeedback(createHitFeedback(event, object, currentTimeMs));
        const eventMapTimeMs = Number.isFinite(event.mapTimeMs) ? event.mapTimeMs : currentTimeMs;
        const sampleContext = sampleContextAt(beatmap.samplePoints, eventMapTimeMs, object ?? {});
        for (const request of hitSoundRequests(event, object ?? {}, sampleContext)) {
          const handle = sampleContext.filename === request.name
            ? effects.resolveCustom(request.name)
            : effects.resolve(request.name, sampleContext.customIndex);
          if (handle?.kind === 'buffer') this.audio.playEffect(handle.buffer, 'effect', 0, request.volume);
        }
      }
      this.judgementCount += events.length;
      const outcome = sessionOutcome({
        failed: gameplay.failed,
        currentTimeMs,
        endTimeMs: drainEndTimeMs,
        hitWindowMs: windows.hit50,
        profileMode: this.profileMode,
      });
      if (outcome) {
        this.finishSession(outcome === 'cleared');
        return;
      }
      if (events.length > 0) this.setStatus(
        `${beatmap.difficultyName} · ${gameplay.score.toString().padStart(8, '0')} · ${gameplay.combo}x · ${(gameplay.accuracy * 100).toFixed(2)}% · HP ${Math.round(gameplay.health.value * 100)} · ${gameplay.rank}`,
      );
    };
    /** @param {number} mapTimeMs */
    const render = (mapTimeMs) => {
      renderer.setCursor(input.playfieldPosition, mapTimeMs);
      renderer.setHudState({
        score: gameplay.score, accuracy: hudAccuracy(gameplay.accuracy, gameplay.judgements), combo: gameplay.combo,
        health: gameplay.health.value, judgements: gameplay.judgements,
        timingErrorMs: lastTimingErrorMs,
        activeChannels: new Set(input.state.activeChannels),
        pressChannels: input.state.pressFeedbackChannels(mapTimeMs),
      });
      const renderState = scheduler.getRenderState(mapTimeMs, preemptMs);
      const rendered = renderer.render(renderState, mapTimeMs, preemptMs);
      lastRenderMetrics = { ...rendered, activeHitObjects: renderState.circles.length + renderState.sliders.length + renderState.spinners.length };
    };
    const frames = new FrameCoordinator(this.audio.clock, advance, render);
    /** @param {number} rafTime */
    const tick = (rafTime) => {
      if (!this.playing) return;
      if (lastRafTime !== null) frameMetrics.record(rafTime - lastRafTime);
      lastRafTime = rafTime;
      const frameMapTimeMs = frames.frame();
      if (!this.playing) return;
      if (this.debugEnabled && this.debugHud && frameMetrics.samples.length % 30 === 0) {
        const metric = frameMetrics.snapshot();
        const counts = input.pressCounts;
        const diagnostic = diagnostics.snapshot();
        this.debugHud.textContent = `FPS ${metric.averageFps} | p95 ${metric.p95FrameMs.toFixed(2)}ms | >33.3 ${(metric.over33Ratio * 100).toFixed(2)}%\nraw ${(frameMapTimeMs - this.settings.offsetMs).toFixed(1)} | map ${frameMapTimeMs.toFixed(1)} | offset ${this.settings.offsetMs}\nhit ${lastRenderMetrics.activeHitObjects} | story ${lastRenderMetrics.activeStoryboardCount} | draw ${lastRenderMetrics.drawCalls}\npress ML ${counts['mouse-left']} MR ${counts['mouse-right']} Z ${counts['key-left']} X ${counts['key-right']} | hold ${input.state.activeChannels.size} | pending ${lastPendingInputCount}\nfallback ${diagnostic.metrics.inputTimestampFallbacks} | sample ${storyboard ? storyboard.samples.length - (storyboardSamples?.scheduled.size ?? 0) : 0} | gen ${this.audio.generation}\nlast ${formatJudgementDiagnostic(diagnostic.lastPress)}`;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.session = { input, renderer, gameplay, beatmap, tick, canvas, windowObject: window, documentObject: document, frameMetrics, diagnostics, resetFrameTime: () => { lastRafTime = null; frames.reset(); }, cleanup: () => { sliderSounds.stop(); spinnerSounds.stop(); window.removeEventListener('resize', resize); } };
    this.audio.playMusic(audioBuffer, 0);
    const readySound = effects.resolve('ready.mp3');
    if (readySound?.kind === 'buffer') this.audio.playEffect(readySound.buffer, 'effect');
    this.setStatus(`${beatmap.difficultyName} · Circle ${beatmap.statistics.circles} / Slider ${beatmap.statistics.sliders} / Spinner ${beatmap.statistics.spinners}`);
    this.rafId = requestAnimationFrame(tick);
  }

  /** @param {string} reason @param {boolean} [audioAlreadyPaused] */
  pause(reason, audioAlreadyPaused = false) {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.rafId);
    this.input?.setActive(false);
    this.input?.dispose();
    this.storyboardSamples?.reset();
    if (!audioAlreadyPaused && this.audio.context?.state === 'running') this.audio.pause();
    document.body.classList.remove('is-playing');
    if (this.scene.current === 'PLAYING') this.transitionTo('PAUSED');
    this.setStatus(`일시정지됨: ${reason}`);
    this.showDialog('일시정지', '<p>입력 상태를 초기화하고 음악과 게임 시간을 같은 위치에서 멈췄습니다.</p>', true);
  }

  async resume() {
    if (this.scene.current !== 'PAUSED' || !this.session) return;
    const resumeButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('resume-button'));
    if (resumeButton) resumeButton.disabled = true;
    for (const count of [3, 2, 1]) { this.setStatus(`${count}…`); await new Promise((resolve) => window.setTimeout(resolve, 350)); }
    try {
      await this.audio.resumeFromGesture();
      this.session.input.attach(this.session.canvas, this.session.windowObject, this.session.documentObject);
      this.session.input.setActive(true);
      this.session.resetFrameTime();
      this.playing = true;
      this.transitionTo('PLAYING');
      document.body.classList.add('is-playing');
      this.elements.dialog.close();
      this.rafId = requestAnimationFrame(this.session.tick);
    } finally { if (resumeButton) resumeButton.disabled = false; }
  }

  /** @param {boolean} cleared */
  finishSession(cleared) {
    if (!this.session || !this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.rafId);
    this.session.input.setActive(false);
    this.session.input.dispose();
    this.session.cleanup();
    this.storyboardSamples?.reset();
    if (this.audio.context?.state === 'running') this.audio.pause();
    document.body.classList.remove('is-playing');
    this.transitionTo(cleared ? 'RESULT' : 'FAILED');
    const gameplay = this.session.gameplay;
    const completion = completionSoundCandidates(cleared)
      .map((name) => this.loadedSession?.effects.resolve(name))
      .find((handle) => handle !== null && handle !== undefined);
    if (completion?.kind === 'buffer') this.audio.playEffect(completion.buffer, 'effect');
    const result = {
      songId: this.song.id, beatmapId: this.session.beatmap.beatmapId, rulesetVersion: RULESET_VERSION,
      score: gameplay.score, accuracy: gameplay.accuracy, maxCombo: gameplay.maxCombo,
      judgements: { ...gameplay.judgements }, sliderBreaks: gameplay.sliderBreaks, spinnerBonus: gameplay.spinnerBonus,
      rank: gameplay.rank, cleared, playedAt: new Date().toISOString(),
    };
    const key = `${result.songId}:${result.beatmapId}:${result.rulesetVersion}`;
    const stored = this.repository.saveBestResult(key, result);
    const view = buildResultPresentation(result, stored.updated);
    const title = cleared ? `${result.rank} · 결과` : 'Failed';
    const difficulty = this.song.difficulties.find((/** @type {any} */ entry) => entry.beatmapId === result.beatmapId);
    const playedAt = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(result.playedAt));
    const content = `<div class="result-shell"><header class="result-header"><strong>${this.song.artist} - ${this.song.title} [${difficulty?.label ?? ''}]</strong><span>Beatmap by ${this.song.creator ?? 'Kyshiro'}</span><span>Played locally on ${playedAt}</span></header><section class="result-panel"><p class="result-record">${view.recordLabel}</p><div class="result-score"><span>SCORE</span><strong>${view.score}</strong></div><section class="result-judgements" aria-label="판정 결과"><div class="is-300"><span>300</span><strong>${view.judgements[300]}x</strong></div><div class="is-100"><span>100</span><strong>${view.judgements[100]}x</strong></div><div class="is-50"><span>50</span><strong>${view.judgements[50]}x</strong></div><div class="is-miss"><span>×</span><strong>${view.judgements.miss}x</strong></div></section><div class="result-summary"><div><span>COMBO</span><strong>${view.maxCombo}</strong></div><div><span>ACCURACY</span><strong>${view.accuracy}</strong></div></div><div class="result-graph" aria-label="플레이 기록 그래프 데이터는 아직 제공되지 않습니다"></div></section></div>`;
    this.showDialog(title, content, false);
  }

  restart() {
    if (!this.loadedSession || !['PAUSED', 'FAILED', 'RESULT'].includes(this.scene.current)) return;
    if (this.scene.current === 'PAUSED') {
      this.session?.input.dispose(); this.storyboardSamples?.reset();
      this.session?.cleanup();
      this.transitionTo('READY');
    } else this.transitionTo('READY');
    this.elements.dialog.close();
    this.session = null;
    const loaded = this.loadedSession;
    this.beginGameplay(loaded.beatmap, loaded.audioBuffer, loaded.skin, loaded.effects, loaded.storyboard, loaded.storyboardResources);
  }

  returnToSelection() {
    if (!['PAUSED', 'FAILED', 'RESULT'].includes(this.scene.current)) return;
    this.session?.input.dispose(); this.storyboardSamples?.reset();
    this.session?.cleanup();
    if (this.audio.context?.state === 'running' && this.audio.clock?.running) this.audio.pause();
    this.transitionTo('DIFFICULTY_SELECT');
    this.playing = false; this.session = null;
    document.body.classList.remove('is-playing', 'is-gameflow');
    this.elements.dialog.close();
    this.elements.startButton.disabled = false;
    this.updatePreviewButton();
    this.renderDifficultyRail();
    this.setStatus('난이도를 선택하고 플레이를 시작하세요.');
    this.elements.startButton.focus();
  }

  /** @param {string} title @param {string} html @param {boolean} paused */
  showDialog(title, html, paused) {
    const heading = document.getElementById('dialog-title'); const content = document.getElementById('dialog-content');
    const resumeButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('resume-button'));
    if (heading) heading.textContent = title; if (content) content.innerHTML = html;
    if (resumeButton) resumeButton.hidden = !paused;
    this.elements.dialog.dataset.scene = this.scene.current;
    this.applyDialogSkin(title);
    if (!this.elements.dialog.open) this.elements.dialog.showModal();
    (paused ? resumeButton : document.getElementById('restart-button'))?.focus();
  }

  applySelectionSkin() {
    if (!this.skinUi) return;
    const artwork = /** @type {HTMLImageElement|null} */ (document.getElementById('mode-artwork'));
    if (artwork) artwork.src = this.skinUi.skinUrl('mode-osu.png');
    const atmosphericArtwork = /** @type {HTMLImageElement|null} */ (document.getElementById('selection-mode-artwork'));
    if (atmosphericArtwork) atmosphericArtwork.src = this.skinUi.skinUrl('mode-osu.png');
    const songArtwork = /** @type {HTMLImageElement|null} */ (document.getElementById('song-card-artwork'));
    if (songArtwork) songArtwork.src = this.skinUi.skinUrl('mode-osu-med.png');
    this.elements.menuPanel.style.backgroundImage = `linear-gradient(rgb(13 13 13 / 88%),rgb(13 13 13 / 88%)),url("${this.skinUi.skinUrl('songselect-bottom.png')}")`;
    this.elements.select.classList.add('skinned-select');
    this.elements.select.style.backgroundImage = `url("${this.skinUi.skinUrl('selection-tab.png')}")`;
    const buttons = [['resume-button', 'pause-continue.png'], ['restart-button', 'pause-retry.png'], ['select-button', 'pause-back.png']];
    for (const [id, image] of buttons) {
      const button = /** @type {HTMLButtonElement|null} */ (document.getElementById(id));
      if (button) { button.classList.add('skinned-action'); button.style.backgroundImage = `url("${this.skinUi.skinUrl(image)}")`; }
    }
  }

  /** @param {string} title */
  applyDialogSkin(title) {
    if (!this.skinUi) return;
    const rank = resultRankFromTitle(title);
    const presentation = sceneSkinPresentation(this.scene.current, rank, Boolean(this.skinUi.mapFailureUrl));
    const artwork = /** @type {HTMLImageElement|null} */ (document.getElementById('dialog-artwork'));
    if (artwork) {
      if (!presentation.artwork) artwork.removeAttribute('src');
      else artwork.src = presentation.artwork.startsWith('map:') ? (this.skinUi.mapFailureUrl ?? '') : this.skinUi.skinUrl(presentation.artwork);
    }
    const section = /** @type {HTMLImageElement|null} */ (document.getElementById('dialog-section-artwork'));
    if (section) {
      if (presentation.section) section.src = this.skinUi.skinUrl(presentation.section);
      else section.removeAttribute('src');
    }
    const resultBackground = this.scene.current === 'RESULT' ? this.skinUi.mapBackgroundUrl : null;
    this.elements.dialog.style.backgroundImage = resultBackground ? `url("${resultBackground}")` : '';
    this.elements.dialog.style.backgroundSize = resultBackground ? 'cover' : '';
    const panelArtwork = /** @type {HTMLImageElement|null} */ (document.getElementById('dialog-panel-artwork'));
    if (panelArtwork) {
      if (presentation.panel) panelArtwork.src = this.skinUi.skinUrl(presentation.panel);
      else panelArtwork.removeAttribute('src');
    }
    if (this.scene.current === 'RESULT') this.elements.dialog.style.setProperty('--result-graph-frame', `url("${this.skinUi.skinUrl('ranking-graph.png')}")`);
    else this.elements.dialog.style.removeProperty('--result-graph-frame');
  }

  /** @param {any} next */
  transitionTo(next) {
    const scene = this.scene.transition(next);
    document.body.dataset.scene = scene;
    if (['LOADING', 'RESULT', 'FAILED'].includes(scene)) void this.uiSounds.play('whoosh.wav');
    return scene;
  }

  /** @param {string} message */
  setStatus(message) { this.elements.status.textContent = message; }
}
