// @ts-check

import { describe, expect, it } from 'vitest';
import { classifyAudioPolicy } from '../../scripts/lib/audio-policy.mjs';

describe('audio decode policy', () => {
  it.each([
    ['skin', 'drum-sliderslide.wav', 0, 0],
    ['skin', 'normal-sliderwhistle.wav', 0, 0],
    ['beatmap', 'soft-sliderslide.wav', 44, 0],
  ])('classifies intentional silence without fallback', (sourceRoot, path, bytes, wavDataBytes) => {
    expect(classifyAudioPolicy({
      sourceRoot: /** @type {'beatmap'|'skin'} */ (sourceRoot),
      path,
      bytes,
      wavDataBytes,
    })).toBe('silent');
  });

  it('keeps a required music track decodable', () => {
    expect(
      classifyAudioPolicy({
        sourceRoot: 'beatmap',
        path: 'toby fox - UNDERTALE Soundtrack - 100 MEGALOVANIA 192.mp3',
        bytes: 3_761_715,
        wavDataBytes: null,
      }),
    ).toBe('required');
  });

  it('marks nonessential skin effects optional', () => {
    expect(
      classifyAudioPolicy({
        sourceRoot: 'skin',
        path: 'combobreak.wav',
        bytes: 105_412,
        wavDataBytes: 105_368,
      }),
    ).toBe('optional');
  });

  it('does not carry the superseded azer8 silence list into YUGEN', () => {
    expect(classifyAudioPolicy({
      sourceRoot: 'skin',
      path: 'drum-hitwhistle.wav',
      bytes: 8_000,
      wavDataBytes: 7_956,
    })).toBe('optional');
  });
});
