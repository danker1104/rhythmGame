// @ts-check

import { describe, expect, it } from 'vitest';
import { ObjectScheduler } from '../../src/engine/objectScheduler.js';
import sliderHeadFixture from '../fixtures/rules/848234/slider-head-late-window.json';
import notelockFixture from '../fixtures/rules/848234/notelock-overlap-slider-head.json';
import spinnerFixture from '../fixtures/rules/848234/spinner-timestamped-trace.json';

describe('Judgement pipeline Stage 3–5 contracts', () => {
  it('starts a Slider head from a press anywhere inside its 50 window', () => {
    const scheduler = new ObjectScheduler(
      [sliderHeadFixture.slider],
      { hit300: 36.8, hit100: 82.4, hit50: 128 },
    );

    const event = scheduler.press(sliderHeadFixture.inputTransitions[0]);

    expect(event).toMatchObject(sliderHeadFixture.expected);
  });

  it('keeps the Slider-head 50-window boundary inclusive across frames', () => {
    const scheduler = new ObjectScheduler(
      [sliderHeadFixture.slider],
      { hit300: 36.8, hit100: 82.4, hit50: 128 },
    );

    expect(scheduler.advance(999, 1128, false, { x: 256, y: 192 })).toEqual([]);
    const events = scheduler.advance(1128, 1129, false, { x: 256, y: 192 }, [
      { channel: 'key-left', phase: 'press', mapTimeMs: 1128, playfieldPosition: { x: 256, y: 192 } },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'slider-part', kind: 'head', result: 'hit', hitErrorMs: 128 });
  });

  it('lets an earlier eligible Slider head notelock a later Circle', () => {
    const scheduler = new ObjectScheduler(notelockFixture.objects, notelockFixture.hitWindows);

    const event = scheduler.press(notelockFixture.inputTransitions[0]);

    expect(event).toBeNull();
  });

  it('consumes a timestamped Spinner trace independently of RAF sampling', () => {
    const scheduler = new ObjectScheduler(
      [spinnerFixture.spinner],
      { hit300: 36.8, hit100: 82.4, hit50: 128 },
    );
    const finalPosition = spinnerFixture.inputTransitions.at(-1)?.playfieldPosition;
    if (!finalPosition) throw new Error('SPINNER_TRACE_EMPTY');

    const events = scheduler.advance(
      spinnerFixture.spinner.startTimeMs - 1,
      spinnerFixture.spinner.endTimeMs,
      false,
      finalPosition,
      /** @type {any} */ (spinnerFixture.inputTransitions),
    );

    expect(events.at(-1)).toMatchObject(spinnerFixture.expected);
  });

  it('produces the same Spinner result when the same trace spans multiple frames', () => {
    const scheduler = new ObjectScheduler(
      [spinnerFixture.spinner],
      { hit300: 36.8, hit100: 82.4, hit50: 128 },
    );
    const firstHalf = spinnerFixture.inputTransitions.filter((transition) => transition.mapTimeMs <= 1500);
    const secondHalf = spinnerFixture.inputTransitions.filter((transition) => transition.mapTimeMs > 1500);
    const firstPosition = firstHalf.at(-1)?.playfieldPosition;
    const finalPosition = secondHalf.at(-1)?.playfieldPosition;
    if (!firstPosition || !finalPosition) throw new Error('SPINNER_TRACE_INCOMPLETE');

    expect(scheduler.advance(999, 1500, true, firstPosition, /** @type {any} */ (firstHalf))).not.toContainEqual(
      expect.objectContaining({ type: 'spinner-judged' }),
    );
    const events = scheduler.advance(1500, 2000, false, finalPosition, /** @type {any} */ (secondHalf));

    expect(events.at(-1)).toMatchObject(spinnerFixture.expected);
  });

  it('emits structured evidence for no-candidate, blocked, and successful presses', () => {
    /** @type {Array<Record<string, any>>} */
    const evidence = [];
    const scheduler = new ObjectScheduler(
      notelockFixture.objects,
      notelockFixture.hitWindows,
      (entry) => evidence.push(entry),
    );

    scheduler.press({ channel: 'key-left', mapTimeMs: 700, playfieldPosition: { x: 0, y: 0 } });
    scheduler.press(notelockFixture.inputTransitions[0]);
    scheduler.press({ channel: 'key-right', mapTimeMs: 1000, playfieldPosition: { x: 100, y: 100 } });

    expect(evidence.map((entry) => entry.result)).toEqual(['no-candidate', 'blocked-outside-radius', 'hit']);
    expect(evidence[1]).toMatchObject({
      event: 'judgement_press',
      candidateId: 20,
      candidateKind: 'slider',
      hitErrorMs: 10,
    });
    expect(evidence[2]).toMatchObject({ candidateId: 20, result: 'hit', distancePx: 0 });
  });
});
