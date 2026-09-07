// @ts-check

import { describe, expect, it } from 'vitest';
import { HitFeedbackTimeline, createHitFeedback } from '../../src/renderer/hitFeedback.js';

describe('hit feedback', () => {
  it('creates a strong, short impact for a 300 circle judgement', () => {
    const feedback = createHitFeedback(
      { type: 'circle-judged', objectId: 7, judgement: '300' },
      { id: 7, kind: 'circle', position: { x: 128, y: 96 }, radius: 40 },
      2000,
    );
    expect(feedback).toMatchObject({ position: { x: 128, y: 96 }, strength: 1, durationMs: 420, assetName: 'hit300.png' });
  });

  it('uses the skin miss image and centers spinner results', () => {
    expect(createHitFeedback(
      { type: 'circle-judged', objectId: 9, judgement: 'miss' },
      { id: 9, kind: 'circle', position: { x: 10, y: 20 }, radius: 30 },
      3000,
    )).toMatchObject({ assetName: 'hit0.png' });
    expect(createHitFeedback(
      { type: 'spinner-judged', objectId: 10, judgement: '100' },
      { id: 10, kind: 'spinner', radius: 40 },
      4000,
    )).toMatchObject({ position: { x: 256, y: 192 }, assetName: 'hit100.png' });
  });

  it('positions slider-part feedback at the part rather than the slider head', () => {
    const feedback = createHitFeedback(
      { type: 'slider-part', objectId: 8, partId: 'tick-1', kind: 'tick', result: 'hit' },
      { id: 8, kind: 'slider', position: { x: 64, y: 64 }, radius: 36, parts: [{ id: 'tick-1', position: { x: 320, y: 180 } }] },
      2100,
    );
    expect(feedback).toMatchObject({ position: { x: 320, y: 180 }, strength: 0.42 });
  });

  it('expires effects using map time, not frame count', () => {
    const timeline = new HitFeedbackTimeline();
    timeline.push({ position: { x: 1, y: 2 }, strength: 1, durationMs: 180, startTimeMs: 1000, tone: '#fff' });
    expect(timeline.snapshot(1090)).toHaveLength(1);
    expect(timeline.snapshot(1181)).toHaveLength(0);
  });

  it('anchors delayed feedback to the authoritative judgement timestamp', () => {
    const feedback = createHitFeedback(
      { type: 'circle-judged', objectId: 7, judgement: '300', mapTimeMs: 2000 },
      { id: 7, kind: 'circle', position: { x: 128, y: 96 }, radius: 40 },
      2080,
    );

    expect(feedback?.startTimeMs).toBe(2000);
  });
});
