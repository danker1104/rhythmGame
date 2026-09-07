// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { PlayfieldRenderer } from '../../src/renderer/playfieldRenderer.js';

function createContext() {
  return /** @type {any} */ ({
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), fillRect: vi.fn(), clearRect: vi.fn(),
    drawImage: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillText: vi.fn(),
  });
}

function createRenderer() {
  const context = createContext();
  const images = new Map([
    'approachcircle.png', 'hitcircle.png', 'hitcircleoverlay.png', 'sliderstartcircle.png', 'sliderstartcircleoverlay.png',
    'sliderendcircle.png', 'sliderscorepoint.png', 'reversearrow.png', 'sliderfollowcircle.png',
    'sliderb0.png', 'cursor.png', 'cursortrail.png', 'followpoint-0.png',
  ].map((name) => [name, { name }]));
  const skin = {
    config: { general: { allowSliderBallTint: true }, colours: { SliderBorder: [90, 90, 70], SliderTrackOverride: [0, 5, 15] }, fonts: { hitCirclePrefix: 'skin-number', hitCircleOverlap: 3 } },
    get: (/** @type {string} */ name) => images.get(name) ?? null,
  };
  const mapper = { cssWidth: 640, cssHeight: 480, scale: 1, playfieldToScreen: (/** @type {{x:number,y:number}} */ point) => point };
  return { context, renderer: new PlayfieldRenderer(context, /** @type {any} */ (mapper), /** @type {any} */ (skin)) };
}

describe('PlayfieldRenderer Standard skin assets', () => {
  it('draws slider start/end layers, ticks, directional repeat, follow circle, and static ball', () => {
    const { context, renderer } = createRenderer();
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 1000, endTimeMs: 2000, spanCount: 2,
      tracking: true,
      comboNumber: 1, comboColour: [47, 67, 212],
      position: { x: 0, y: 0 }, pathPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      parts: [
        { kind: 'head', result: null },
        { kind: 'tick', result: null, position: { x: 50, y: 0 } },
        { kind: 'repeat', result: null, position: { x: 100, y: 0 } },
        { kind: 'tail', result: null, position: { x: 0, y: 0 } },
      ],
    }, 1250);

    const names = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0]?.name).filter(Boolean);
    expect(names).toEqual(expect.arrayContaining([
      'hitcircle.png', 'hitcircleoverlay.png', 'sliderendcircle.png',
      'sliderscorepoint.png', 'reversearrow.png', 'sliderfollowcircle.png', 'sliderb0.png',
    ]));
    expect(names).not.toContain('sliderstartcircle.png');
    expect(context.rotate).toHaveBeenCalledWith(Math.PI);
  });

  it('draws Circle and Slider heads with the exact same skin layers and diameter', () => {
    const { context, renderer } = createRenderer();
    renderer.drawCircleCommand(context, {
      type: 'hit-circle', position: { x: 100, y: 100 }, radius: 32,
      scale: 1, opacity: 1, comboColour: [47, 67, 212],
    });
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 1000, endTimeMs: 2000, spanCount: 1,
      tracking: false, comboNumber: 1, comboColour: [47, 67, 212], position: { x: 100, y: 100 },
      pathPoints: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      parts: [{ kind: 'head', result: null }, { kind: 'tail', result: null, position: { x: 200, y: 100 } }],
    }, 900, 1200);

    const hitCircleCalls = context.drawImage.mock.calls.filter((/** @type {any[]} */ call) => call[0]?.name === 'hitcircle.png');
    expect(hitCircleCalls).toHaveLength(2);
    expect(hitCircleCalls.map((/** @type {any[]} */ call) => call.slice(-2))).toEqual([[64, 64], [64, 64]]);
  });

  it('shows the Slider follow circle only while runtime tracking is active', () => {
    const { context, renderer } = createRenderer();
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 1000, endTimeMs: 2000, spanCount: 1,
      tracking: false, comboNumber: 1, comboColour: [47, 67, 212],
      position: { x: 0, y: 0 }, pathPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      parts: [{ kind: 'head', result: 'hit' }, { kind: 'tail', result: null, position: { x: 100, y: 0 } }],
    }, 1250);

    const names = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0]?.name);
    expect(names).not.toContain('sliderfollowcircle.png');
    expect(names).toContain('sliderb0.png');
  });

  it('shrinks a skinned approach circle onto the slider head and layers the body for depth', () => {
    const { context, renderer } = createRenderer();
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 2000, endTimeMs: 3000, spanCount: 1,
      comboNumber: 1, comboColour: [47, 67, 212], position: { x: 100, y: 100 },
      pathPoints: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      parts: [{ kind: 'head', result: null }, { kind: 'tail', result: null, position: { x: 200, y: 100 } }],
    }, 1000, 1200);

    const approach = context.drawImage.mock.calls.find((/** @type {any[]} */ call) => call[0]?.name === 'approachcircle.png');
    expect(approach).toBeDefined();
    expect(approach[3]).toBeGreaterThan(64);
    expect(context.stroke).toHaveBeenCalledTimes(4);

    context.drawImage.mockClear();
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 2000, endTimeMs: 3000, spanCount: 1,
      comboNumber: 1, comboColour: [47, 67, 212], position: { x: 100, y: 100 },
      pathPoints: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      parts: [{ kind: 'head', result: null }, { kind: 'tail', result: null, position: { x: 200, y: 100 } }],
    }, 1800, 1200);
    const laterApproach = context.drawImage.mock.calls.find((/** @type {any[]} */ call) => call[0]?.name === 'approachcircle.png');
    expect(laterApproach[3]).toBeLessThan(approach[3]);
  });

  it('fades the whole upcoming Slider and does not show its ball before the start time', () => {
    const { context, renderer } = createRenderer();
    renderer.drawSlider(context, {
      id: 1, radius: 32, startTimeMs: 2000, endTimeMs: 3000, spanCount: 1,
      finalJudgement: null, comboNumber: 1, comboColour: [47, 67, 212], position: { x: 100, y: 100 },
      pathPoints: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      parts: [{ kind: 'head', result: null }, { kind: 'tail', result: null, position: { x: 200, y: 100 } }],
    }, 900, 1200);

    const names = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0]?.name);
    expect(context.globalAlpha).toBeGreaterThan(0);
    expect(context.globalAlpha).toBeLessThan(1);
    expect(names).not.toContain('sliderb0.png');
  });

  it('draws upcoming Sliders behind the currently active Slider', () => {
    const { renderer } = createRenderer();
    /** @type {string[]} */
    const drawOrder = [];
    renderer.drawSlider = (_context, slider) => drawOrder.push(slider.id);

    renderer.render({
      sliders: [
        { id: 'active', startTimeMs: 1000 },
        { id: 'near-future', startTimeMs: 1800 },
        { id: 'far-future', startTimeMs: 2100 },
      ],
      circles: [],
      spinners: [],
    }, 1500, 1200);

    expect(drawOrder).toEqual(['far-future', 'near-future', 'active']);
  });

  it('renders cursor trail points with cursortrail.png instead of synthetic circles', () => {
    const { context, renderer } = createRenderer();
    renderer.cursorTrail = [{ x: 10, y: 20 }, { x: 20, y: 20 }, { x: 30, y: 20 }];

    renderer.drawCursorTrail(context);

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls.every((/** @type {any[]} */ call) => call[0].name === 'cursortrail.png')).toBe(true);
    expect(context.arc).not.toHaveBeenCalled();
  });

  it('never tints hit-circle images directly against the opaque playfield', () => {
    const { context, renderer } = createRenderer();
    const image = { name: 'hitcircle.png' };

    renderer.drawTintedImage(context, /** @type {any} */ (image), 10, 20, 64, 64, [47, 67, 212]);

    expect(context.drawImage).toHaveBeenCalledWith(image, 10, 20, 64, 64);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it('resolves combo digits through the skin.ini hit-circle prefix', () => {
    const { context, renderer } = createRenderer();
    const digit = { name: 'skin-number-7.png' };
    renderer.skin.get = (name) => name === 'skin-number-7.png' ? /** @type {any} */ (digit) : null;

    renderer.drawComboNumber(context, { x: 100, y: 100 }, 40, 7);

    expect(context.drawImage).toHaveBeenCalledWith(digit, expect.any(Number), expect.any(Number), 20, 28);
    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('draws judgement feedback from the supplied result bitmap', () => {
    const { context, renderer } = createRenderer();
    const result = { name: 'hit300.png' };
    renderer.skin.get = (name) => name === 'hit300.png' ? /** @type {any} */ (result) : null;

    renderer.drawHitFeedback(context, { position: { x: 100, y: 100 }, radius: 40, progress: 0.25, assetName: 'hit300.png', strength: 1, tone: '#fff' });

    expect(context.drawImage).toHaveBeenCalledWith(result, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  });

  it('animates a visible spinner layer, shrinks the approach circle, and does not invent a time-based warning', () => {
    const { context, renderer } = createRenderer();
    renderer.skin.get = (name) => /** @type {any} */ ({
      name,
      width: name === 'spinner-spin.png' ? 1 : name === 'spinner-warning.png' ? 96 : 400,
      height: name === 'spinner-spin.png' ? 1 : name === 'spinner-warning.png' ? 96 : 400,
    });

    renderer.drawSpinner(context, { startTimeMs: 0, endTimeMs: 2000, rotationRadians: Math.PI, requiredSpins: 2 }, 1500);

    const names = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0].name);
    expect(names).toContain('spinner-circle.png');
    expect(names).not.toContain('spinner-spin.png');
    expect(names).not.toContain('spinner-warning.png');
    expect(context.rotate).toHaveBeenCalledWith(Math.PI);
    const approach = context.drawImage.mock.calls.find((/** @type {any[]} */ call) => call[0].name === 'spinner-approachcircle.png');
    expect(approach[3]).toBeLessThan(400);
    expect(context.fillText).toHaveBeenCalledWith('0.5', 256, expect.any(Number));
    expect(context.arc).toHaveBeenCalledWith(256, 192, expect.any(Number), -Math.PI / 2, expect.any(Number));
  });

  it('draws score, HP, combo, accuracy, and input overlay with skin assets', () => {
    const { context, renderer } = createRenderer();
    renderer.skin.get = (name) => /** @type {any} */ ({ name });
    renderer.setHudState({
      score: 1234, accuracy: 0.9876, combo: 42, health: 0.73,
      judgements: { 300: 12, 100: 3, 50: 1, miss: 2 },
      activeChannels: new Set(['key-left']), pressChannels: new Set(['mouse-right']),
    });

    renderer.drawHud(context);

    const names = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0].name);
    expect(names).toEqual(expect.arrayContaining([
      'scorebar-bg.png', 'scorebar-colour.png', 'scorebar-marker.png', 'score-percent.png',
      'combo-x.png', 'inputoverlay-background.png', 'inputoverlay-key.png',
    ]));
    expect(context.fillText.mock.calls.flat()).toEqual(expect.arrayContaining(['300', '100', '50', 'MISS', 'K1', 'K2', 'M1', 'M2']));
  });

  it('renders score, accuracy, and combo HUD glyphs at exactly 1.5 times their former size', () => {
    const { context, renderer } = createRenderer();
    renderer.skin.get = (name) => /** @type {any} */ ({ name });
    const drawHudGlyphs = vi.fn();
    renderer.drawHudGlyphs = drawHudGlyphs;
    renderer.setHudState({
      score: 1234, accuracy: 0.9876, combo: 42, health: 0.73,
      judgements: { 300: 12, 100: 3, 50: 1, miss: 2 },
      activeChannels: new Set(), pressChannels: new Set(),
    });

    renderer.drawHud(context);

    expect(drawHudGlyphs.mock.calls.slice(0, 3).map((/** @type {any[]} */ call) => call[6])).toEqual([36, 33, 42]);
    const comboX = context.drawImage.mock.calls.find((/** @type {any[]} */ call) => call[0]?.name === 'combo-x.png');
    expect(comboX.slice(-2)).toEqual([33, 33]);
  });

  it('keeps essential HUD while hiding optional judgement, timing, and input detail', () => {
    const { context, renderer } = createRenderer();
    renderer.skin.get = (name) => /** @type {any} */ ({ name });
    renderer.setVisualSettings({ hudDetailEnabled: false, inputOverlayEnabled: false });
    renderer.setHudState({
      score: 12, accuracy: 1, combo: 2, health: 1, timingErrorMs: 12,
      judgements: { 300: 1, 100: 0, 50: 0, miss: 0 }, activeChannels: new Set(), pressChannels: new Set(),
    });

    renderer.drawHud(context);

    const text = context.fillText.mock.calls.flat();
    const images = context.drawImage.mock.calls.map((/** @type {any[]} */ call) => call[0]?.name);
    expect(text).not.toEqual(expect.arrayContaining(['300', 'K1', 'K2', 'M1', 'M2']));
    expect(images).not.toEqual(expect.arrayContaining(['inputoverlay-background.png', 'inputoverlay-key.png']));
    expect(context.fillRect).not.toHaveBeenCalledWith(expect.any(Number), 450, expect.any(Number), 3);
    expect(images).toEqual(expect.arrayContaining(['scorebar-bg.png', 'score-percent.png', 'combo-x.png']));
  });

  it('keeps cursor trail lifetime based on map time instead of render count', () => {
    const { renderer } = createRenderer();
    renderer.setCursor({ x: 10, y: 10 }, 1000);
    renderer.setCursor({ x: 20, y: 10 }, 1040);
    renderer.setCursor({ x: 30, y: 10 }, 1080);
    renderer.setCursor({ x: 40, y: 10 }, 1161);

    expect(renderer.cursorTrail.map((point) => point.x)).toEqual([20, 30, 40]);
  });

  it('does not synthesize a cursor trail when the active skin declares a transparent trail asset', () => {
    const { context, renderer } = createRenderer();
    renderer.cursorTrail = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
    renderer.skin.getRole = () => null;
    renderer.skin.hasRole = (role) => role === 'cursorTrail';

    renderer.drawCursorTrail(context);

    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
  });

  it('draws the lower timing bar and clamps the latest hit error marker', () => {
    const { context, renderer } = createRenderer();
    renderer.setHudState({
      score: 0, accuracy: 1, combo: 0, health: 1, timingErrorMs: 250,
      judgements: { 300: 1, 100: 0, 50: 0, miss: 0 }, activeChannels: new Set(), pressChannels: new Set(),
    });

    renderer.drawHud(context);

    expect(context.fillRect).toHaveBeenCalledWith(185.6, 450, 268.8, 3);
    expect(context.fillRect).toHaveBeenCalledWith(452.9, 443, 3, 17);
  });

  it('draws the DANSER lead-in prompt in the center HUD layer', () => {
    const { context, renderer } = createRenderer();
    renderer.setHitObjects([{ startTimeMs: 7_984 }]);

    renderer.render({ circles: [], sliders: [], spinners: [] }, 1_000, 600);

    expect(context.fillText).toHaveBeenCalledWith('DANSER', 320, 224);
  });
});
