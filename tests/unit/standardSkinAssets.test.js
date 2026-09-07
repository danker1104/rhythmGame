// @ts-check

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildStandardSkinPlan } from '../../src/skin/standardSkinAssets.js';
import { parseSkinIni } from '../../src/skin/skinIniParser.js';

describe('Standard runtime skin asset contract', () => {
  it('groups the complete prepared Standard image closure without unsupported modes or modifiers', async () => {
    const manifest = JSON.parse(await readFile(path.resolve('public/skins/v3/yugen/manifest.json'), 'utf8'));
    const config = parseSkinIni(await readFile(path.resolve('public/skins/v3/yugen/Skin.ini'), 'utf8'));

    const plan = buildStandardSkinPlan(manifest, config);
    const planned = Object.values(plan.groups).flat();

    expect(new Set(planned).size).toBeGreaterThanOrEqual(80);
    expect(planned).toContain('sliderb0.png');
    expect(planned).not.toContain('sliderstartcircleoverlay.png');
    expect(planned).toContain('spinner-warning.png');
    expect(planned).toContain('ranking-panel.png');
    expect(planned.some((name) => /mania|taiko|catch|mod-/i.test(name))).toBe(false);
    expect(plan.diagnostics).toContain('SKIN_OPTIONAL_IMAGE_MISSING: sliderstartcircle.png');
    expect(plan.roles).toMatchObject({
      circleBase: 'hitcircle.png',
      circleOverlay: 'hitcircleoverlay.png',
      approachCircle: 'approachcircle.png',
      sliderBall: 'sliderb0.png',
      sliderHeadBase: 'hitcircle.png',
      sliderHeadOverlay: 'hitcircleoverlay.png',
      sliderTail: 'sliderendcircle.png',
      cursor: 'cursor.png',
      cursorTrail: 'cursortrail.png',
    });
    expect(plan.roles.followPoints).toEqual(['followpoint-0.png', 'followpoint-1.png', 'followpoint-2.png']);
    expect(plan.roles.sliderStartBase).toBeNull();
    expect(plan.roles.sliderEndOverlay).toBeNull();
  });

  it('fails when a required gameplay image is missing', () => {
    const manifest = { schemaVersion: 1, files: [{ path: 'cursor.png', role: 'image' }] };
    const config = parseSkinIni('[General]\nVersion: latest\n[Fonts]\nHitCirclePrefix: default\nScorePrefix: score');

    expect(() => buildStandardSkinPlan(manifest, config)).toThrow('SKIN_REQUIRED_IMAGE_MISSING: approachcircle.png');
  });

  it('selects one @2x counterpart for high-DPR rendering while preserving logical roles', async () => {
    const manifest = JSON.parse(await readFile(path.resolve('public/skins/v3/yugen/manifest.json'), 'utf8'));
    const config = parseSkinIni(await readFile(path.resolve('public/skins/v3/yugen/Skin.ini'), 'utf8'));

    const plan = buildStandardSkinPlan(manifest, config, { highResolution: true });
    const planned = Object.values(plan.groups).flat();

    expect(plan.roles.circleBase).toBe('hitcircle@2x.png');
    expect(plan.roles.sliderBall).toBe('sliderb0@2x.png');
    expect(plan.roles.sliderTail).toBe('sliderendcircle.png');
    expect(planned).toContain('cursor@2x.png');
    expect(planned).not.toContain('cursor.png');
  });

  it('reports an optional image missing without rejecting the skin', async () => {
    const manifest = JSON.parse(await readFile(path.resolve('public/skins/v3/yugen/manifest.json'), 'utf8'));
    manifest.files = manifest.files.filter((/** @type {any} */ file) => file.path !== 'ranking-graph.png');
    const config = parseSkinIni(await readFile(path.resolve('public/skins/v3/yugen/Skin.ini'), 'utf8'));

    const plan = buildStandardSkinPlan(manifest, config);

    expect(plan.diagnostics).toContain('SKIN_OPTIONAL_IMAGE_MISSING: ranking-graph.png');
    expect(plan.groups.results).not.toContain('ranking-graph.png');
  });
});
