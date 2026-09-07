// @ts-check

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeBeatmapText } from '../../src/beatmap/beatmapAdapter.js';

const fixtures = JSON.parse(
  await readFile(path.resolve('tests/fixtures/megalovania/beatmaps.json'), 'utf8'),
);

describe('MEGALOVANIA beatmap adapter', () => {
  for (const fixture of fixtures) {
    it(`converts ${fixture.difficulty} parser instances to the documented plain DTO`, async () => {
    const filePath = path.resolve(
      '387700 toby fox - MEGALOVANIA',
      `toby fox - MEGALOVANIA (Kyshiro) [${fixture.difficulty}].osu`,
    );
    const model = decodeBeatmapText(await readFile(filePath, 'utf8'));

    expect({
      difficulty: model.difficultyName,
      beatmapId: model.beatmapId,
      hp: model.hpDrainRate,
      cs: model.circleSize,
      od: model.overallDifficulty,
      ar: model.approachRate,
      sliderMultiplier: model.sliderMultiplier,
      timingPoints: model.statistics.timingPointCount,
      total: model.statistics.total,
      circles: model.statistics.circles,
      sliders: model.statistics.sliders,
      spinners: model.statistics.spinners,
      firstStartTimeMs: model.statistics.firstStartTimeMs,
      lastStartTimeMs: model.statistics.lastStartTimeMs,
    }).toEqual(fixture);
    expect(model.mode).toBe(0);
    expect(model.beatmapSetId).toBe(387700);
    expect(model.standardMaxCombo).toBeGreaterThanOrEqual(model.statistics.total);
    expect(Object.getPrototypeOf(model)).toBe(Object.prototype);
    expect(model.hitObjects.every((object) => Object.getPrototypeOf(object) === Object.prototype)).toBe(true);
    expect(model.timingPoints.every((point) => Object.getPrototypeOf(point) === Object.prototype)).toBe(true);
    expect(model.samplePoints.length).toBeGreaterThan(0);
    });
  }
});
