// @ts-check

import { describe, expect, it } from 'vitest';
import { createSliderRuntime, judgeSliderHeadPress, missSliderHead, sliderPositionAt, updateSliderRuntime } from '../../src/rules/sliderJudge.js';
import fixture from '../fixtures/rules/slider-sequences.json';

const slider = {
  id: 1, kind: 'slider', startTimeMs: 1000, endTimeMs: 2000, radius: 32,
  pathPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }], spanCount: 2,
  nestedParts: [
    { id: 'head', kind: 'head', timeMs: 1000, position: { x: 0, y: 0 } },
    { id: 'repeat-1', kind: 'repeat', timeMs: 1500, position: { x: 100, y: 0 } },
    { id: 'tail', kind: 'tail', timeMs: 1964, position: { x: 0, y: 0 } },
  ],
};

describe('Slider rules', () => {
  it('matches dropped-frame, part-ratio, and legacy-tail fixtures', () => {
    expect(fixture.rulesetVersion).toBe(4);
    expect(fixture.mapSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fixture.slider.endTimeMs - fixture.slider.legacyTailTimeMs).toBe(36);
    const fixtureSlider = {
      ...fixture.slider,
      nestedParts: fixture.slider.nestedParts.map((/** @type {any} */ part) => ({
        ...part,
        position: { x: part.kind === 'repeat' ? 100 : 0, y: 0 },
      })),
    };
    for (const item of fixture.cases) {
      const state = createSliderRuntime(fixtureSlider);
      if (item.parts[0] === 'hit') {
        judgeSliderHeadPress(state, { mapTimeMs: 1000, playfieldPosition: item.cursor }, { hit50: 128 });
      } else {
        missSliderHead(state);
      }
      updateSliderRuntime(state, 900, 2100, item.holding, item.cursor);
      expect(state.parts.map((/** @type {any} */ part) => part.result), item.name).toEqual(item.parts);
      expect(state.finalJudgement, item.name).toBe(item.final);
    }
  });
  it('traverses alternating spans using the arc-length path', () => {
    expect(sliderPositionAt(slider, 1250)).toEqual({ x: 50, y: 0 });
    expect(sliderPositionAt(slider, 1750)).toEqual({ x: 50, y: 0 });
  });

  it('awards due parts while any input channel is held inside 2.4 radii', () => {
    const state = createSliderRuntime(slider);
    expect(judgeSliderHeadPress(state, { mapTimeMs: 1000, playfieldPosition: { x: 0, y: 0 } }, { hit50: 100 })).toMatchObject({ result: 'hit' });
    const events = updateSliderRuntime(state, 1000, 1500, true, { x: 50, y: 0 });
    expect(events.map((event) => event.result)).toEqual(['hit']);
    expect(state.parts.map((/** @type {any} */ part) => part.result)).toEqual(['hit', 'hit', null]);
    expect(state.tracking).toBe(true);
  });

  it('exposes follow-circle tracking only while held inside the current ball radius', () => {
    const state = createSliderRuntime(slider);
    expect(state.tracking).toBe(false);
    updateSliderRuntime(state, 1100, 1250, true, { x: 50, y: 0 });
    expect(state.tracking).toBe(true);
    updateSliderRuntime(state, 1250, 1260, false, { x: 52, y: 0 });
    expect(state.tracking).toBe(false);
  });

  it('processes every elapsed part once and grades the acquired ratio', () => {
    const state = createSliderRuntime(slider);
    missSliderHead(state);
    updateSliderRuntime(state, 900, 2100, false, { x: 0, y: 0 });
    expect(state.parts.map((/** @type {any} */ part) => part.result)).toEqual(['miss', 'miss', 'miss']);
    expect(state.finalJudgement).toBe('miss');
  });
});
