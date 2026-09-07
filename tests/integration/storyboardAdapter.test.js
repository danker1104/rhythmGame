// @ts-check

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeBeatmapText } from '../../src/beatmap/beatmapAdapter.js';
import { decodeStoryboardText, storyboardImagePaths } from '../../src/storyboard/storyboardAdapter.js';

describe('Storyboard adapter', () => {
  it('combines selected .osu elements before shared .osb elements per layer', async () => {
    const root = path.resolve('387700 toby fox - MEGALOVANIA');
    const osuNames = (await readdir(root)).filter((name) => name.endsWith('.osu'));
    const osb = await readFile(path.join(root, 'Toby Fox - MEGALOVANIA (Kyshiro).osb'), 'utf8');
    expect(osuNames).toHaveLength(5);
    const decoded = await Promise.all(osuNames.map(async (name) => {
      const source = await readFile(path.join(root, name), 'utf8');
      return { storyboard: decodeStoryboardText(source, osb), beatmap: decodeBeatmapText(source) };
    }));
    const allReferencedPaths = new Set();
    for (const { storyboard: candidate, beatmap } of decoded) {
      expect(candidate.layers.flatMap((layer) => layer.objects)).toHaveLength(17);
      expect(candidate.samples).toEqual([{ id: 'osb-Background-1', layer: 'Background', startTimeMs: 80359, path: 'sans burn in hell.wav', volume: 0.8 }]);
      expect(candidate.diagnostics).toEqual([]);
      const imagePaths = storyboardImagePaths(candidate);
      expect(imagePaths).toHaveLength(54);
      for (const imagePath of imagePaths) allReferencedPaths.add(imagePath);
      for (const sample of candidate.samples) allReferencedPaths.add(sample.path);
      allReferencedPaths.add(beatmap.audioPath);
      allReferencedPaths.add(beatmap.backgroundPath);
      expect(candidate.layers.flatMap((layer) => layer.objects).filter((object) => object.kind === 'animation')).toEqual([
        expect.objectContaining({ path: 'SB/Sans Idle/idle.png', frameCount: 43, frameDelayMs: 25, loopForever: true }),
      ]);
    }
    expect(allReferencedPaths.size).toBe(65);
    const storyboard = decoded[0].storyboard;
    const visualObjects = storyboard.layers.flatMap((layer) => layer.objects);
    const commands = visualObjects.flatMap((object) => object.commands);

    expect(visualObjects).toHaveLength(17);
    expect(storyboard.samples).toEqual([{ id: 'osb-Background-1', layer: 'Background', startTimeMs: 80359, path: 'sans burn in hell.wav', volume: 0.8 }]);
    expect(commands.filter((command) => command.type === 'F')).toHaveLength(22);
    expect(commands.filter((command) => command.type === 'M')).toHaveLength(141);
    expect(commands.filter((command) => command.type === 'S')).toHaveLength(15);
    const foreground = storyboard.layers.find((layer) => layer.name === 'Foreground');
    expect(foreground?.objects.slice(0, 4).map((object) => object.source)).toEqual(['osu', 'osu', 'osu', 'osb']);
    expect(() => JSON.parse(JSON.stringify(storyboard))).not.toThrow();
  });

  it('reports and skips a command outside the current F, M and S contract', () => {
    const storyboard = decodeStoryboardText([
      '[Events]',
      'Sprite,Foreground,Centre,"SB/test.png",320,240',
      ' R,0,0,100,0,1',
    ].join('\n'), '[Events]');

    const object = storyboard.layers.find((layer) => layer.name === 'Foreground')?.objects[0];
    expect(object?.commands).toEqual([]);
    expect(storyboard.diagnostics).toEqual(['STORYBOARD_COMMAND_SKIPPED: osu-Foreground-0 R']);
  });
});
