// @ts-check

import { describe, expect, it } from 'vitest';
import { ObjectScheduler } from '../../src/engine/objectScheduler.js';

describe('ObjectScheduler', () => {
  it('processes Slider parts and Spinner completion across a dropped frame', () => {
    const scheduler = new ObjectScheduler([
      { id: 1, kind: 'slider', startTimeMs: 100, endTimeMs: 200, radius: 32, spanCount: 1,
        pathPoints: [{x:0,y:0},{x:10,y:0}], nestedParts: [
          {id:'head',kind:'head',timeMs:100,position:{x:0,y:0}},
          {id:'tail',kind:'tail',timeMs:164,position:{x:10,y:0}},
        ] },
      { id: 2, kind: 'spinner', startTimeMs: 300, endTimeMs: 400, requiredSpins: 1 },
    ], { hit300: 30, hit100: 60, hit50: 100 });
    const sliderEvents = scheduler.advance(0, 250, true, {x:10,y:0}, [
      {channel:'key-left',phase:'press',mapTimeMs:100,playfieldPosition:{x:0,y:0},synthetic:false},
      {channel:null,phase:'move',mapTimeMs:164,playfieldPosition:{x:10,y:0},synthetic:false},
    ]);
    const spinnerEvents = scheduler.advance(250, 450, false, {x:256,y:192});
    expect(sliderEvents.filter((event) => event.type === 'slider-part')).toHaveLength(2);
    expect(sliderEvents.at(-1)).toMatchObject({type:'slider-judged',judgement:'300'});
    expect(spinnerEvents.at(-1)).toMatchObject({type:'spinner-judged',judgement:'miss'});
  });

  it('keeps a completed Slider renderable through its end fade instead of popping out at the legacy tail', () => {
    const scheduler = new ObjectScheduler([
      { id: 1, kind: 'slider', startTimeMs: 100, endTimeMs: 200, radius: 32, spanCount: 1,
        pathPoints: [{x:0,y:0},{x:10,y:0}], nestedParts: [
          {id:'head',kind:'head',timeMs:100,position:{x:0,y:0}},
          {id:'tail',kind:'tail',timeMs:164,position:{x:10,y:0}},
        ] },
    ], { hit300: 30, hit100: 60, hit50: 100 });

    scheduler.advance(0, 164, true, {x:10,y:0});

    expect(scheduler.getRenderState(190, 600).sliders).toHaveLength(1);
    expect(scheduler.getRenderState(260, 600).sliders).toHaveLength(1);
    expect(scheduler.getRenderState(321, 600).sliders).toHaveLength(0);
  });

  it('uses ordered press, move, and release history for Slider parts inside one dropped frame', () => {
    const scheduler = new ObjectScheduler([
      { id: 3, kind: 'slider', startTimeMs: 100, endTimeMs: 200, radius: 32, spanCount: 1,
        position: {x:0,y:0}, pathPoints: [{x:0,y:0},{x:10,y:0}], nestedParts: [
          {id:'head',kind:'head',timeMs:100,position:{x:0,y:0}},
          {id:'tick',kind:'tick',timeMs:120,position:{x:2,y:0}},
          {id:'tail',kind:'tail',timeMs:164,position:{x:10,y:0}},
        ] },
    ], { hit300: 30, hit100: 60, hit50: 100 });
    const transitions = [
      {channel:'key-left',phase:'press',mapTimeMs:100,playfieldPosition:{x:0,y:0},synthetic:false},
      {channel:null,phase:'move',mapTimeMs:119,playfieldPosition:{x:2,y:0},synthetic:false},
      {channel:'key-left',phase:'release',mapTimeMs:130,playfieldPosition:{x:2,y:0},synthetic:false},
    ];

    const events = scheduler.advance(0, 250, false, {x:2,y:0}, /** @type {any} */ (transitions));

    expect(events.filter((event) => event.type === 'slider-part').map((event) => [event.kind, event.result])).toEqual([
      ['head', 'hit'],
      ['tick', 'hit'],
      ['tail', 'miss'],
    ]);
    expect(events.at(-1)).toMatchObject({type:'slider-judged',judgement:'100'});
  });

  it('emits elapsed misses before a later press from the same dropped frame', () => {
    const scheduler = new ObjectScheduler([
      {id:4,kind:'circle',startTimeMs:100,position:{x:0,y:0},radius:20},
      {id:5,kind:'circle',startTimeMs:250,position:{x:100,y:0},radius:20},
    ], { hit300: 30, hit100: 60, hit50: 100 });

    const events = scheduler.advance(0, 300, false, {x:100,y:0}, [
      {channel:'key-left',phase:'press',mapTimeMs:250,playfieldPosition:{x:100,y:0},synthetic:false},
    ]);

    expect(events.map((event) => [event.objectId, event.judgement])).toEqual([
      [4, 'miss'],
      [5, '300'],
    ]);
  });

  it('keeps the inclusive 50-window boundary hittable across adjacent frames', () => {
    const scheduler = new ObjectScheduler([
      {id:6,kind:'circle',startTimeMs:100,position:{x:20,y:20},radius:20},
    ], { hit300: 30, hit100: 60, hit50: 100 });

    expect(scheduler.advance(0, 200, false, {x:20,y:20})).toEqual([]);
    const events = scheduler.advance(200, 201, false, {x:20,y:20}, [
      {channel:'key-left',phase:'press',mapTimeMs:200,playfieldPosition:{x:20,y:20},synthetic:false},
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({objectId:6,judgement:'50',hitErrorMs:100});
  });
});
