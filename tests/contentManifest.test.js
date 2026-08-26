import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CONTENT, getDeployableAssetPaths } from '../src/config/contentManifest.js';
import { resolveContentUrl } from '../src/config/resolveContentUrl.js';

describe('content manifest', () => {
  it('exposes The Last Page and the four stable MVP difficulty IDs', () => {
    expect(CONTENT.song.id).toBe('the-last-page');
    expect(CONTENT.song.difficulties.map(({ id }) => id)).toEqual([
      'easy',
      'normal',
      'hard',
      'insane',
    ]);
  });

  it('contains only normalized relative deployment paths', () => {
    for (const assetPath of getDeployableAssetPaths()) {
      expect(assetPath).not.toMatch(/^[/\\]/);
      expect(assetPath).not.toContain('..');
      expect(assetPath).not.toContain('\\');
    }
  });

  it('resolves assets below the configured Vite base path', () => {
    expect(resolveContentUrl('songs/the-last-page/audio.mp3', '/game/')).toBe(
      '/game/songs/the-last-page/audio.mp3',
    );
  });

  it('rejects paths that can escape the content root', () => {
    expect(() => resolveContentUrl('../audio.mp3', '/game/')).toThrow(
      'Content paths must stay inside the public root',
    );
  });

  it('points every manifest entry to a real public file with matching casing', async () => {
    for (const assetPath of getDeployableAssetPaths()) {
      const fileUrl = new URL(`../public/${assetPath}`, import.meta.url);
      await expect(access(fileURLToPath(fileUrl))).resolves.toBeUndefined();
    }
  });
});
