import { parseOsuBeatmap } from '../beatmap/osuParser.js';
import { CONTENT } from '../config/contentManifest.js';
import { resolveContentUrl } from '../config/resolveContentUrl.js';

export class ResourceLoadError extends Error {
  constructor(message, { resourceType, path = null, status = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ResourceLoadError';
    this.resourceType = resourceType;
    this.path = path;
    this.status = status;
    this.retryable = true;
  }
}

async function fetchAsset({ fetchImpl, baseUrl, path, resourceType, readAs }) {
  let response;

  try {
    response = await fetchImpl(resolveContentUrl(path, baseUrl));
  } catch (cause) {
    throw new ResourceLoadError(`${resourceType}을(를) 불러오지 못했습니다.`, {
      resourceType,
      path,
      cause,
    });
  }

  if (!response.ok) {
    throw new ResourceLoadError(`${resourceType} 요청이 실패했습니다. (HTTP ${response.status})`, {
      resourceType,
      path,
      status: response.status,
    });
  }

  return response[readAs]();
}

export async function loadDifficultyResources({
  difficultyId,
  baseUrl = '/',
  fetchImpl = globalThis.fetch,
  onProgress = () => {},
  onWarning = () => {},
} = {}) {
  const difficulty = CONTENT.song.difficulties.find(({ id }) => id === difficultyId);
  if (!difficulty) {
    throw new ResourceLoadError(`알 수 없는 난이도입니다: ${difficultyId}`, {
      resourceType: '난이도',
    });
  }
  if (typeof fetchImpl !== 'function') {
    throw new ResourceLoadError('리소스를 요청할 수 없는 환경입니다.', {
      resourceType: '네트워크',
    });
  }

  const tasks = [
    { key: 'beatmapText', label: '비트맵', path: difficulty.mapPath, readAs: 'text', required: true },
    { key: 'audioData', label: '음원', path: CONTENT.song.audioPath, readAs: 'arrayBuffer', required: true },
    { key: 'noteOuter', label: '외곽 레인 노트', path: CONTENT.skin.images.noteOuter, readAs: 'blob', required: true },
    { key: 'noteInner', label: '중앙 레인 노트', path: CONTENT.skin.images.noteInner, readAs: 'blob', required: true },
    { key: 'background', label: '배경', path: CONTENT.song.backgroundPath, readAs: 'blob', required: false },
    { key: 'menuClick', label: '메뉴 효과음', path: CONTENT.skin.effects.menuClick, readAs: 'arrayBuffer', required: false },
    { key: 'hitNormal', label: '타격 효과음', path: CONTENT.skin.effects.hitNormal, readAs: 'arrayBuffer', required: false },
  ];
  const loaded = {};
  let completed = 0;

  onProgress({ completed, total: tasks.length, percent: 0, current: '준비 중' });

  for (const task of tasks) {
    onProgress({
      completed,
      total: tasks.length,
      percent: Math.round((completed / tasks.length) * 100),
      current: task.label,
    });

    try {
      loaded[task.key] = await fetchAsset({
        fetchImpl,
        baseUrl,
        path: task.path,
        resourceType: task.label,
        readAs: task.readAs,
      });
    } catch (error) {
      if (task.required) throw error;
      loaded[task.key] = null;
      onWarning(`${task.label}을(를) 불러오지 못해 기본 표시로 계속합니다.`);
    }

    completed += 1;
    onProgress({
      completed,
      total: tasks.length,
      percent: Math.round((completed / tasks.length) * 100),
      current: task.label,
    });
  }

  let beatmap;
  try {
    beatmap = parseOsuBeatmap(loaded.beatmapText);
  } catch (cause) {
    throw new ResourceLoadError(`비트맵 형식이 올바르지 않습니다: ${cause.message}`, {
      resourceType: '비트맵',
      path: difficulty.mapPath,
      cause,
    });
  }

  return {
    difficulty,
    beatmap,
    audioData: loaded.audioData,
    requiredImages: [loaded.noteOuter, loaded.noteInner],
    background: loaded.background,
    optionalEffects: { menuClick: loaded.menuClick, hitNormal: loaded.hitNormal },
  };
}
