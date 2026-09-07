// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { CoordinateMapper } from '../../src/input/coordinateMapper.js';

describe('CoordinateMapper', () => {
  it('matches the accepted 1280x720 storyboard and Standard composition exactly', () => {
    const mapper = new CoordinateMapper(1280, 720, 1);

    expect(mapper.scale).toBe(1.5);
    expect(mapper.storyboardRect).toEqual({ x: 160, y: 0, width: 960, height: 720 });
    expect(mapper.playfieldRect).toEqual({ x: 256, y: 72, width: 768, height: 576 });
    expect(mapper.playfieldToScreen({ x: 0, y: 0 })).toEqual({ x: 256, y: 72 });
    expect(mapper.screenToPlayfield({ x: 1024, y: 648 })).toEqual({ x: 512, y: 384 });
  });

  it('round-trips playfield coordinates through a widescreen stage', () => {
    const mapper = new CoordinateMapper(1920, 1080, 2.5);
    const screen = mapper.playfieldToScreen({ x: 256, y: 192 });
    expect(screen).toEqual({ x: 960, y: 540 });
    expect(mapper.screenToPlayfield(screen)).toEqual({ x: 256, y: 192 });
    expect(mapper.storyboardRect).toEqual({ x: 240, y: 0, width: 1440, height: 1080 });
    expect(mapper.playfieldRect).toEqual({ x: 384, y: 108, width: 1152, height: 864 });
  });

  it('keeps the Standard playfield 4:3 at 4:3 and narrow viewports', () => {
    const fourThree = new CoordinateMapper(1024, 768, 1);
    expect(fourThree.playfieldRect.x).toBeCloseTo(102.4, 12);
    expect(fourThree.playfieldRect.y).toBeCloseTo(76.8, 12);
    expect(fourThree.playfieldRect.width).toBeCloseTo(819.2, 12);
    expect(fourThree.playfieldRect.height).toBeCloseTo(614.4, 12);
    expect(fourThree.playfieldRect.width / fourThree.playfieldRect.height).toBeCloseTo(4 / 3, 12);

    const narrow = new CoordinateMapper(768, 1024, 1);
    expect(narrow.playfieldRect.width / narrow.playfieldRect.height).toBeCloseTo(4 / 3, 12);
    expect(narrow.playfieldRect.x).toBeGreaterThanOrEqual(0);
    expect(narrow.playfieldRect.y).toBeGreaterThanOrEqual(0);
  });

  it('uses the documented storyboard offset', () => {
    const mapper = new CoordinateMapper(640, 480, 1);
    expect(mapper.playfieldToStoryboard({ x: 0, y: 0 })).toEqual({ x: 64, y: 48 });
    expect(mapper.storyboardToPlayfield({ x: 64, y: 48 })).toEqual({ x: 0, y: 0 });
  });

  it('caps effective DPR at 2 and rounds backing dimensions', () => {
    const mapper = new CoordinateMapper(1024.4, 768.4, 3);
    expect(mapper.backingSize).toEqual({ width: 2049, height: 1537, effectiveDpr: 2 });
  });

  it('restores the CSS-pixel context transform after backing resize', () => {
    const mapper = new CoordinateMapper(640, 480, 2.5);
    const canvas = { width: 0, height: 0, style: { width: '', height: '' } };
    const context = { setTransform: vi.fn() };
    mapper.resizeCanvas(/** @type {any} */ (canvas), /** @type {any} */ (context));
    expect(canvas).toMatchObject({ width: 1280, height: 960, style: { width: '640px', height: '480px' } });
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('resizes from the viewport instead of reading stale inline Canvas dimensions', () => {
    const mapper = new CoordinateMapper(1280, 720, 1);
    const canvas = { width: 1280, height: 720, style: { width: '1280px', height: '720px' } };
    const context = { setTransform: vi.fn() };

    mapper.resizeToViewport(
      { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1.5 },
      /** @type {any} */ (canvas),
      /** @type {any} */ (context),
    );

    expect(mapper).toMatchObject({ cssWidth: 1024, cssHeight: 768 });
    expect(canvas).toMatchObject({ width: 1536, height: 1152, style: { width: '1024px', height: '768px' } });
  });
});
