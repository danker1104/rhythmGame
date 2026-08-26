import { describe, expect, it, vi } from 'vitest';

import { loadTextureSet, TextureLoadError } from '../src/skin/textureLoader.js';

describe('loadTextureSet', () => {
  it('prefers an available @2x texture on high-density displays', async () => {
    const imageLoader = vi.fn(async (url) => ({ url, width: 200, height: 100 }));
    const textures = await loadTextureSet({
      definitions: {
        stageBottom: { path: 'skins/yugen/mania-stage-bottom.png', highDpiPath: 'skins/yugen/mania-stage-bottom@2x.png', required: false },
      },
      pixelRatio: 2,
      imageLoader,
    });

    expect(imageLoader).toHaveBeenCalledWith('/skins/yugen/mania-stage-bottom@2x.png');
    expect(textures.stageBottom.scale).toBe(0.5);
  });

  it('blocks rendering when a required note texture fails', async () => {
    await expect(loadTextureSet({
      definitions: { noteOuter: { path: 'skins/yugen/mania-note1.png', required: true } },
      imageLoader: vi.fn().mockRejectedValue(new Error('decode failed')),
    })).rejects.toBeInstanceOf(TextureLoadError);
  });
});

