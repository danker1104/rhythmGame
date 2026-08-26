import { describe, expect, it, vi } from 'vitest';

import { GameplayRenderer, noteY } from '../src/renderer/gameplayRenderer.js';

function fakeCanvas() {
  const context = {
    setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(),
    save: vi.fn(), restore: vi.fn(), fillText: vi.fn(),
    set fillStyle(_value) {}, set font(_value) {}, set textAlign(_value) {},
  };
  return { canvas: { width: 0, height: 0, style: {}, getContext: () => context }, context };
}

const SKIN = {
  columnStart: 340,
  hitPosition: 400,
  columnWidths: [45, 45, 45, 45],
  columnColours: Array.from({ length: 4 }, () => [0, 0, 0, 240]),
};

const TEXTURES = {
  noteOuter: { image: { id: 'note-outer' }, scale: 1 }, noteInner: { image: { id: 'note-inner' }, scale: 1 },
  holdOuterHead: { image: { id: 'hold-outer-head' }, scale: 1 }, holdInnerHead: { image: { id: 'hold-inner-head' }, scale: 1 },
  holdOuterBody: { image: { id: 'hold-outer-body' }, scale: 1 }, holdInnerBody: { image: { id: 'hold-inner-body' }, scale: 1 },
  keyOuter: { image: { id: 'key-outer' }, scale: 1 }, keyInner: { image: { id: 'key-inner' }, scale: 1 },
};

describe('GameplayRenderer', () => {
  it('renders tap notes at full lane width and 80% height', () => {
    const { canvas, context } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 1 });
    renderer.setBeatmap({ hitObjects: [{
      id: 1, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 0,
    }] });

    renderer.render({ songTimeMs: 900, pixelsPerMs: 0.5 });

    expect(context.drawImage).toHaveBeenCalledWith(TEXTURES.noteOuter.image, 340, 342, 45, 16);
  });

  it('uses the documented audio-time note position formula', () => {
    expect(noteY({ noteTimeMs: 2000, songTimeMs: 1000, hitPosition: 400, pixelsPerMs: 0.4 })).toBe(0);
  });

  it('scales the backing canvas while retaining 640x480 logical coordinates', () => {
    const { canvas, context } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 2 });
    renderer.resize();

    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(960);
    expect(canvas.style.aspectRatio).toBe('640 / 480');
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('culls off-screen notes instead of drawing all Insane objects', () => {
    const { canvas } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 1 });
    renderer.setBeatmap({
      hitObjects: Array.from({ length: 1408 }, (_, id) => ({
        id, lane: id % 4, startTimeMs: id * 100, endTimeMs: null, kind: 'tap', hitSound: 0,
      })),
    });

    const stats = renderer.render({ songTimeMs: 70_000, pixelsPerMs: 0.5 });
    expect(stats.visibleNotes).toBeGreaterThan(0);
    expect(stats.visibleNotes).toBeLessThan(40);
  });

  it('does not draw finalized notes and accepts pressed lane state', () => {
    const { canvas, context } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 1 });
    renderer.setBeatmap({ hitObjects: [{ id: 1, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap' }] });
    const stats = renderer.render({
      songTimeMs: 1000,
      pixelsPerMs: 0.5,
      pressedLanes: new Set([0]),
      hiddenNoteIds: new Set([1]),
    });

    expect(stats.visibleNotes).toBe(0);
    expect(context.drawImage).toHaveBeenCalled();
  });

  it('clips a hold note at the judgement line after its start is hit', () => {
    const { canvas, context } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 1 });
    renderer.setBeatmap({ hitObjects: [{
      id: 1, lane: 0, startTimeMs: 1000, endTimeMs: 2000, kind: 'hold', hitSound: 0,
    }] });

    renderer.render({ songTimeMs: 1200, pixelsPerMs: 0.5, pressedLanes: new Set([0]) });

    expect(context.drawImage).toHaveBeenCalledWith(TEXTURES.holdOuterBody.image, 340, 0, 45, 400);
    expect(context.drawImage).not.toHaveBeenCalledWith(TEXTURES.noteOuter.image, expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it('stops drawing a tap note when it reaches the key rectangle', () => {
    const { canvas, context } = fakeCanvas();
    const renderer = new GameplayRenderer(canvas, { skin: SKIN, textures: TEXTURES, pixelRatio: 1 });
    renderer.setBeatmap({ hitObjects: [{
      id: 1, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 0,
    }] });

    const stats = renderer.render({ songTimeMs: 1000, pixelsPerMs: 0.5 });

    expect(stats.visibleNotes).toBe(0);
    expect(context.drawImage).not.toHaveBeenCalledWith(TEXTURES.noteOuter.image, expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });
});
