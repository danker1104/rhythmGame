// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { SkinManager } from '../../src/skin/skinManager.js';

describe('SkinManager runtime configuration', () => {
  it('rejects the superseded malformed General header', () => {
    const skin = new SkinManager(vi.fn());

    expect(() => skin.configure('\uFEFF¬[General]\nName: legacy skin\nVersion: latest')).toThrow(
      'SKIN_GENERAL_SECTION_MISSING',
    );
  });

  it('keeps loading after an optional image fails and records a diagnostic', async () => {
    const skin = new SkinManager(vi.fn());
    skin.loadImage = vi.fn(async (name) => name === 'cursortrail.png' ? null : /** @type {any} */ ({ name }));

    await skin.loadPlannedImages(
      ['cursor.png', 'cursortrail.png'],
      new Set(['cursor.png']),
      (name) => `/skin/${name}`,
    );

    expect(skin.diagnostics).toContain('SKIN_OPTIONAL_IMAGE_LOAD_FAILED: cursortrail.png');
  });

  it('rejects the load when a required image fails', async () => {
    const skin = new SkinManager(vi.fn());
    skin.loadImage = vi.fn(async () => null);

    await expect(skin.loadPlannedImages(
      ['cursor.png'],
      new Set(['cursor.png']),
      (name) => `/skin/${name}`,
    )).rejects.toThrow('SKIN_REQUIRED_IMAGE_LOAD_FAILED: cursor.png');
  });

  it('falls back from an undecodable @2x bitmap to its exact YUGEN counterpart', async () => {
    const skin = new SkinManager(vi.fn());
    skin.loadImage = vi.fn(async (name, url) => {
      if (url.endsWith('hitcircle@2x.png')) throw new Error('decode failed');
      const image = /** @type {any} */ ({ name: 'decoded-hitcircle' });
      skin.images.set(name, image);
      return image;
    });

    await skin.loadPlannedImages(
      ['hitcircle@2x.png'],
      new Set(['hitcircle@2x.png']),
      (name) => `/skin/${name}`,
    );

    expect(skin.loadImage).toHaveBeenNthCalledWith(2, 'hitcircle@2x.png', '/skin/hitcircle.png');
    expect(skin.get('hitcircle@2x.png')).toMatchObject({ name: 'decoded-hitcircle' });
    expect(skin.diagnostics).toContain('SKIN_HIGH_RESOLUTION_FALLBACK: hitcircle@2x.png -> hitcircle.png');
  });

});
