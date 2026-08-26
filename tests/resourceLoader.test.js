import { describe, expect, it, vi } from 'vitest';

import { loadDifficultyResources, ResourceLoadError } from '../src/loader/resourceLoader.js';

const MAP = `osu file format v14
[General]
AudioFilename: audio.mp3
PreviewTime: 0
Mode: 3
[Metadata]
Title:The Last Page
Artist:ARForest
Creator:PokeSky
Version:Easy
BeatmapID:2654029
BeatmapSetID:1276332
[Difficulty]
HPDrainRate:6.5
CircleSize:4
OverallDifficulty:6.5
[Events]
0,0,"bg.jpg",0,0
[TimingPoints]
0,500,4,2,1,50,1,0
[HitObjects]
64,192,1000,1,0,0:0:0:0:`;

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(String(body)),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    blob: vi.fn().mockResolvedValue(new Blob([body])),
  };
}

function successfulFetch(url) {
  if (url.endsWith('easy.osu')) return Promise.resolve(response(MAP));
  return Promise.resolve(response('asset'));
}

describe('difficulty resource loader', () => {
  it('loads the selected map, song and required note textures with progress', async () => {
    const onProgress = vi.fn();
    const resources = await loadDifficultyResources({
      difficultyId: 'easy',
      baseUrl: '/game/',
      fetchImpl: successfulFetch,
      onProgress,
    });

    expect(resources.difficulty.id).toBe('easy');
    expect(resources.beatmap.hitObjects).toHaveLength(1);
    expect(resources.audioData).toBeInstanceOf(ArrayBuffer);
    expect(resources.requiredImages).toHaveLength(2);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({
      completed: expect.any(Number),
      total: expect.any(Number),
      percent: 100,
    }));
  });

  it('continues with a warning when the optional background fails', async () => {
    const onWarning = vi.fn();
    const fetchImpl = vi.fn((url) => {
      if (url.endsWith('bg.jpg')) return Promise.resolve(response('', { ok: false, status: 404 }));
      return successfulFetch(url);
    });

    const resources = await loadDifficultyResources({
      difficultyId: 'easy',
      fetchImpl,
      onWarning,
    });

    expect(resources.background).toBeNull();
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('배경'));
  });

  it('reports an actionable error when a required beatmap fails', async () => {
    const fetchImpl = vi.fn((url) => {
      if (url.endsWith('easy.osu')) return Promise.resolve(response('', { ok: false, status: 404 }));
      return successfulFetch(url);
    });

    await expect(loadDifficultyResources({ difficultyId: 'easy', fetchImpl })).rejects.toMatchObject({
      name: 'ResourceLoadError',
      resourceType: '비트맵',
      status: 404,
      retryable: true,
    });
    await expect(loadDifficultyResources({ difficultyId: 'missing', fetchImpl })).rejects.toBeInstanceOf(
      ResourceLoadError,
    );
  });
});
