// @ts-check

import { describe, expect, it } from 'vitest';
import { hitSoundRequests, sampleContextAt } from '../../src/audio/hitSoundFeedback.js';

describe('gameplay hit sounds', () => {
  it('layers the base sample with declared whistle and clap accents', () => {
    expect(hitSoundRequests(
      { type: 'circle-judged', judgement: '300' },
      { hitSound: 2 | 8 },
    )).toEqual([
      { name: 'normal-hitnormal.wav', volume: 1 },
      { name: 'normal-hitwhistle.wav', volume: 0.78 },
      { name: 'normal-hitclap.wav', volume: 0.78 },
    ]);
  });

  it('resolves timing-point Soft samples and Drum additions with declared volume', () => {
    const context = sampleContextAt([
      { startTimeMs: 0, sampleSet: 'Normal', customIndex: 1, volume: 60 },
      { startTimeMs: 1000, sampleSet: 'Soft', customIndex: 1, volume: 40 },
    ], 1500, { samples: [{ sampleSet: 'Drum', hitSound: 'Soft', customIndex: 0, volume: 0, filename: '' }] });
    expect(hitSoundRequests({ type: 'circle-judged', judgement: '300' }, { hitSound: 8 }, context)).toEqual([
      { name: 'soft-hitnormal.wav', volume: 0.4 },
      { name: 'drum-hitclap.wav', volume: 0.312 },
    ]);
  });

  it('honors a custom sample filename instead of falling back', () => {
    expect(hitSoundRequests(
      { type: 'circle-judged', judgement: '300' },
      { hitSound: 0 },
      { sampleSet: 'normal', additionSet: 'normal', customIndex: 1, volume: 0.5, filename: 'custom.wav' },
    )).toEqual([{ name: 'custom.wav', volume: 0.5 }]);
  });

  it('requests combo break on a missed slider part', () => {
    expect(hitSoundRequests({ type: 'slider-part', kind: 'repeat', result: 'miss', comboBreak: true }, {})).toEqual([
      { name: 'combobreak.wav', volume: 1 },
    ]);
  });

  it('keeps weaker judgements quieter and misses silent', () => {
    expect(hitSoundRequests({ type: 'circle-judged', judgement: '50' }, { hitSound: 0 })).toEqual([
      { name: 'normal-hitnormal.wav', volume: 0.62 },
    ]);
    expect(hitSoundRequests({ type: 'circle-judged', judgement: 'miss' }, { hitSound: 15 })).toEqual([]);
  });

  it('uses the crisp tick sample for slider ticks', () => {
    expect(hitSoundRequests({ type: 'slider-part', kind: 'tick', result: 'hit' }, {})).toEqual([
      { name: 'normal-slidertick.wav', volume: 0.58 },
    ]);
  });

  it('uses per-edge Slider additions for head and tail samples', () => {
    const object = {
      hitSound: 0,
      parts: [{ id: 'head', kind: 'head' }, { id: 'tail', kind: 'tail' }],
      edgeSamples: [
        [{ sampleSet: 'None', hitSound: 'Normal', customIndex: 0, volume: 0, filename: '' }, { sampleSet: 'Drum', hitSound: 'Finish', customIndex: 0, volume: 0, filename: '' }],
        [{ sampleSet: 'Soft', hitSound: 'Whistle', customIndex: 0, volume: 0, filename: '' }],
      ],
    };
    const context = { sampleSet: 'normal', additionSet: 'normal', customIndex: 1, volume: 0.6, filename: '' };

    expect(hitSoundRequests({ type: 'slider-part', partId: 'head', kind: 'head', result: 'hit' }, object, context)).toEqual([
      { name: 'normal-hitnormal.wav', volume: 0.528 },
      { name: 'drum-hitfinish.wav', volume: 0.528 },
    ]);
    expect(hitSoundRequests({ type: 'slider-part', partId: 'tail', kind: 'tail', result: 'hit' }, object, context)).toEqual([
      { name: 'soft-hitwhistle.wav', volume: 0.348 },
    ]);
  });
});
