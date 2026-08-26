import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { laneFromX, parseOsuBeatmap } from '../src/beatmap/osuParser.js';

const FIXTURES = [
  { file: 'easy.osu', difficulty: 'Easy', beatmapId: 2654029, objects: 547, holds: 81 },
  { file: 'normal.osu', difficulty: 'Normal', beatmapId: 2652890, objects: 831, holds: 108 },
  { file: 'hard.osu', difficulty: 'Hard', beatmapId: 2652889, objects: 1214, holds: 25 },
  { file: 'insane.osu', difficulty: 'Insane', beatmapId: 2651800, objects: 1408, holds: 152 },
];

async function readFixture(file) {
  return readFile(new URL(`../public/songs/the-last-page/${file}`, import.meta.url), 'utf8');
}

function minimalMap({ mode = 3, keys = 4, audio = 'audio.mp3', background = 'bg.jpg', objects = '' } = {}) {
  return `osu file format v14

[General]
AudioFilename: ${audio}
PreviewTime: 1234
Mode: ${mode}

[Metadata]
Title:Title
Artist:Artist
Creator:Creator
Version:Easy
BeatmapID:1
BeatmapSetID:2

[Difficulty]
HPDrainRate:5
CircleSize:${keys}
OverallDifficulty:6

[Events]
0,0,"${background}",0,0

[TimingPoints]
1000,500,4,2,1,50,1,0

[HitObjects]
${objects}`;
}

describe('laneFromX', () => {
  it.each([
    [0, 0], [127, 0], [128, 1], [255, 1],
    [256, 2], [383, 2], [384, 3], [511, 3],
  ])('maps x=%i to lane %i', (x, lane) => {
    expect(laneFromX(x)).toBe(lane);
  });
});

describe('parseOsuBeatmap', () => {
  it.each(FIXTURES)('parses the checked-in $difficulty map', async (fixture) => {
    const beatmap = parseOsuBeatmap(await readFixture(fixture.file));
    const holds = beatmap.hitObjects.filter(({ kind }) => kind === 'hold');

    expect(beatmap).toMatchObject({
      beatmapId: fixture.beatmapId,
      setId: 1276332,
      title: 'The Last Page',
      artist: 'ARForest',
      creator: 'PokeSky',
      difficulty: fixture.difficulty,
      mode: 3,
      keyCount: 4,
      audioFilename: 'audio.mp3',
      backgroundFilename: 'bg.jpg',
      previewTimeMs: 98934,
    });
    expect(beatmap.timingPoints).toHaveLength(13);
    expect(beatmap.hitObjects).toHaveLength(fixture.objects);
    expect(holds).toHaveLength(fixture.holds);
    expect(beatmap.hitObjects[0].startTimeMs).toBe(7550);
    expect(beatmap.hitObjects.at(-1).startTimeMs).toBe(136626);
  });

  it('parses taps and holds and sorts by time, lane, then original order', () => {
    const beatmap = parseOsuBeatmap(minimalMap({
      objects: [
        '448,192,2000,1,2,0:0:0:0:',
        '192,192,1000,128,4,1500:0:0:0:0:',
        '64,192,1000,1,8,0:0:0:0:',
      ].join('\n'),
    }));

    expect(beatmap.hitObjects).toEqual([
      { id: 2, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 8 },
      { id: 1, lane: 1, startTimeMs: 1000, endTimeMs: 1500, kind: 'hold', hitSound: 4 },
      { id: 0, lane: 3, startTimeMs: 2000, endTimeMs: null, kind: 'tap', hitSound: 2 },
    ]);
  });

  it.each([
    ['non-Mania maps', { mode: 0 }, 'Only Mania mode'],
    ['non-4Key maps', { keys: 7 }, 'Only 4Key beatmaps'],
    ['audio traversal', { audio: '../audio.mp3' }, 'AudioFilename'],
    ['background traversal', { background: '../bg.jpg' }, 'background filename'],
    ['holds ending before they start', { objects: '64,192,2000,128,0,1500:0:0:0:0:' }, 'Hold end time'],
  ])('rejects %s', (_name, options, message) => {
    expect(() => parseOsuBeatmap(minimalMap(options))).toThrow(message);
  });
});
