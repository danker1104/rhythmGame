// @ts-check

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { validatePreparedContent } from '../../scripts/lib/validate-prepared-content.mjs';

describe('prepared MEGALOVANIA content', () => {
  it('matches the versioned manifest and dependency-closure contract', async () => {
    const result = await validatePreparedContent(path.resolve('.'));

    expect(result.storyboardReferences).toEqual({ total: 82, unique: 65 });
    expect(result.silentSkinAudio).toBe(2);
    expect(result.silentBeatmapAudio).toBe(1);
    expect(result.difficultyCount).toBe(5);
    expect(result.contentBytes).toBeLessThanOrEqual(35 * 1024 * 1024);
    expect(result.contentBytes).toBe(27_939_533);
    expect(result.skinSourceInventory).toEqual({
      directFiles: 620,
      bytes: 28_427_094,
      images: 565,
      png: 561,
      jpg: 4,
      wav: 50,
      mp3: 3,
      ini: 1,
      excludedMetadata: ['Thumbs.db'],
      transparentPng: 36,
      oneByOnePng: 24,
      explicitHighResolutionPng: 227,
      uppercasePaths: 74,
      caseConflicts: 0,
    });
    expect(result.skinFileCount).toBe(182);
    expect(result.missingCanonicalSkinAudio).toEqual([]);

    const skinManifest = JSON.parse(await readFile(path.resolve('public/skins/v3/yugen/manifest.json'), 'utf8'));
    const skinPaths = new Set(skinManifest.files.map((/** @type {{path:string}} */ entry) => entry.path));
    expect([...skinPaths]).toEqual(expect.arrayContaining(['menuhit.wav', 'menuclick.wav', 'menuback.wav', 'whoosh.wav']));

    const catalog = JSON.parse(await readFile(path.resolve('public/catalog/v1/catalog.json'), 'utf8'));
    expect(catalog.defaultSkinId).toBe('yugen-v3');
    expect(catalog.skins).toEqual([{
      id: 'yugen-v3',
      root: 'skins/v3/yugen/',
      manifest: 'manifest.json',
      config: 'Skin.ini',
    }]);
  }, 15_000);
});
