// @ts-check

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSkinIni, resolveSliderBallAssets } from '../../src/skin/skinIniParser.js';

describe('skin.ini adapter', () => {
  it('parses the active normal General section and applies the last valid duplicate value', async () => {
    const source = await readFile(path.resolve('- YUGEN -/Skin.ini'), 'utf8');
    const result = parseSkinIni(source);

    expect(result.warnings).not.toContain('SKIN_RECOVERED_GENERAL_PREFIX');
    expect(result.general.version).toBe('2.4');
    expect(result.general.sliderBallFrames).toBe(60);
    expect(result.colours.comboColours).toEqual([
      [26, 116, 242], [164, 32, 240], [37, 185, 239], [23, 209, 116], [226, 45, 124],
    ]);
    expect(result.fonts).toMatchObject({ hitCirclePrefix: 'default', scorePrefix: 'score' });
    expect(result.warnings).toContain('SKIN_UNKNOWN_KEY:General.HitCircleOverlayAboveNumer');
  });

  it('rejects broad garbage-prefix recovery', () => {
    expect(() => parseSkinIni('garbage[General]\nVersion: latest')).toThrow(
      'SKIN_GENERAL_SECTION_MISSING',
    );
  });

  it('uses the static slider ball when numbered frames do not exist', () => {
    expect(resolveSliderBallAssets(['sliderb0.png'], 60)).toEqual(['sliderb0.png']);
  });

  it('uses only continuous numbered frames starting from zero', () => {
    expect(resolveSliderBallAssets(['sliderb.png', 'sliderb0.png', 'sliderb1.png', 'sliderb3.png'], 60)).toEqual([
      'sliderb0.png',
      'sliderb1.png',
    ]);
  });

  it('keeps the documented follow points and transparent placeholders as valid manifest assets', async () => {
    const manifest = JSON.parse(
      await readFile(path.resolve('public/skins/v3/yugen/manifest.json'), 'utf8'),
    );
    const paths = manifest.files.map((/** @type {any} */ file) => file.path);

    expect(paths.filter((/** @type {string} */ file) => /^followpoint-[0-2]\.png$/.test(file))).toHaveLength(3);
    expect(paths).not.toContain('followpoint.png');
    expect(resolveSliderBallAssets(paths, 60)).toEqual(['sliderb0.png']);
    expect(manifest.files.find((/** @type {any} */ file) => file.path === 'sliderendcircle.png').bytes).toBeGreaterThan(0);
    expect(manifest.files.find((/** @type {any} */ file) => file.path === 'hit300-0.png').bytes).toBeGreaterThan(0);
    expect(manifest.files.find((/** @type {any} */ file) => file.path === 'drum-sliderslide.wav').decodePolicy).toBe('silent');
    expect(manifest.files.find((/** @type {any} */ file) => file.path === 'normal-sliderwhistle.wav').decodePolicy).toBe('silent');
  });
});
