// @ts-check

import { describe, expect, it } from 'vitest';
import { HitSoundResolver } from '../../src/audio/hitsoundResolver.js';

/** @param {string} name */
const buffer = (name) => ({ name });

describe('HitSoundResolver', () => {
  it('prefers indexed then unnumbered beatmap samples before the skin MP3', () => {
    const resolver = new HitSoundResolver(
      new Map([
        ['normal-hitclap2.wav', { kind: 'buffer', buffer: buffer('map-indexed') }],
        ['normal-hitclap.wav', { kind: 'buffer', buffer: buffer('map') }],
      ]),
      new Map([['normal-hitclap.mp3', { kind: 'buffer', buffer: buffer('skin') }]]),
    );

    expect(resolver.resolve('normal-hitclap.wav', 2)).toEqual({ kind: 'buffer', buffer: buffer('map-indexed') });
    expect(resolver.resolve('normal-hitclap.wav', 1)).toEqual({ kind: 'buffer', buffer: buffer('map') });
  });

  it('treats a beatmap silent sample as a successful lookup that stops skin fallback', () => {
    const resolver = new HitSoundResolver(
      new Map([['soft-sliderslide.wav', { kind: 'silent' }]]),
      new Map([['soft-sliderslide.mp3', { kind: 'buffer', buffer: buffer('skin') }]]),
    );

    expect(resolver.resolve('soft-sliderslide.wav', 1)).toEqual({ kind: 'silent' });
  });

  it('uses an exact custom filename only from the beatmap root', () => {
    const resolver = new HitSoundResolver(
      new Map([['custom.wav', { kind: 'buffer', buffer: buffer('custom') }]]),
      new Map([['custom.mp3', { kind: 'buffer', buffer: buffer('skin') }]]),
    );

    expect(resolver.resolveCustom('custom.wav')).toEqual({ kind: 'buffer', buffer: buffer('custom') });
    expect(resolver.resolveCustom('missing.wav')).toBeNull();
  });

  it('does not guess variants when a canonical skin sound is missing', () => {
    const resolver = new HitSoundResolver(new Map(), new Map([
      ['normal-sliderwhistle2.mp3', { kind: 'buffer', buffer: buffer('wrong') }],
    ]));
    expect(resolver.resolve('normal-sliderwhistle.wav', 1)).toBeNull();
  });

  it('prefers the exact YUGEN WAV before an alternate extension', () => {
    const resolver = new HitSoundResolver(new Map(), new Map([
      ['normal-hitnormal.wav', { kind: 'buffer', buffer: buffer('yugen-wav') }],
      ['normal-hitnormal.mp3', { kind: 'buffer', buffer: buffer('alternate') }],
    ]));

    expect(resolver.resolve('normal-hitnormal.wav')).toEqual({ kind: 'buffer', buffer: buffer('yugen-wav') });
  });

  it('uses application fallback only after beatmap and skin miss', () => {
    const resolver = new HitSoundResolver(
      new Map(),
      new Map(),
      new Map([['normal-hitnormal.wav', { kind: 'buffer', buffer: buffer('app') }]]),
    );

    expect(resolver.resolve('normal-hitnormal.wav')).toEqual({ kind: 'buffer', buffer: buffer('app') });
  });

  it('lets a YUGEN explicit-silence match stop application fallback', () => {
    const resolver = new HitSoundResolver(
      new Map(),
      new Map([['drum-sliderslide.wav', { kind: 'silent' }]]),
      new Map([['drum-sliderslide.wav', { kind: 'buffer', buffer: buffer('app') }]]),
    );

    expect(resolver.resolve('drum-sliderslide.wav')).toEqual({ kind: 'silent' });
  });
});
