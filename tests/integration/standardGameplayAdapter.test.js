// @ts-check

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeBeatmapText } from '../../src/beatmap/beatmapAdapter.js';

describe('Standard gameplay DTO adapter', () => {
  it('materializes Slider paths/parts and Spinner requirements as plain data', async () => {
    const root = path.resolve('387700 toby fox - MEGALOVANIA');
    const file = (await readdir(root)).find((name) => name.endsWith('.osu'));
    if (!file) throw new Error('fixture missing');
    const beatmap = decodeBeatmapText(await readFile(path.join(root, file), 'utf8'));
    const slider = /** @type {any} */ (beatmap.hitObjects.find((object) => object.kind === 'slider'));
    const spinner = /** @type {any} */ (beatmap.hitObjects.find((object) => object.kind === 'spinner'));
    expect(slider.pathPoints.length).toBeGreaterThan(2);
    expect(slider.nestedParts.map((/** @type {any} */ part) => part.kind)).toContain('tail');
    expect(slider.nestedParts).toHaveLength(3);
    expect(spinner.requiredSpins).toBeGreaterThan(0);
    expect(() => JSON.parse(JSON.stringify(beatmap))).not.toThrow();
  });

  it('exports Standard stacked positions instead of the raw overlapping coordinates', async () => {
    const filePath = path.resolve(
      '387700 toby fox - MEGALOVANIA',
      'toby fox - MEGALOVANIA (Kyshiro) [Hard].osu',
    );
    const beatmap = decodeBeatmapText(await readFile(filePath, 'utf8'));
    const stackedCircle = beatmap.hitObjects.find((object) => object.startTimeMs === 22234);

    expect(stackedCircle?.position.x).toBeCloseTo(125.2624, 3);
    expect(stackedCircle?.position.y).toBeCloseTo(71.2624, 3);
  });
});
