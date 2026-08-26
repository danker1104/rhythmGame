import './styles.css';
import { createApp } from './app/app.js';
import { createAudioUnlock } from './audio/audioUnlock.js';
import { createAudioSystem } from './audio/audioSystem.js';
import { CONTENT } from './config/contentManifest.js';
import { resolveContentUrl } from './config/resolveContentUrl.js';
import { loadDifficultyResources } from './loader/resourceLoader.js';
import { loadYugenSkin } from './skin/skinManager.js';
import { createLocalRepository } from './storage/localRepository.js';

const app = document.querySelector('#app');
const baseUrl = import.meta.env.BASE_URL;

app.style.setProperty(
  '--menu-background',
  `url("${resolveContentUrl(CONTENT.skin.images.menuBackground, baseUrl)}")`,
);

const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
const unlockAudio = createAudioUnlock(() => {
  if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
  return new AudioContextClass();
});
const repository = createLocalRepository();

createApp(app, {
  unlockAudio,
  createAudioSystem,
  loadResources: loadDifficultyResources,
  loadSkin: loadYugenSkin,
  baseUrl,
  repository,
});
