// @ts-check

import { describe, expect, it } from 'vitest';
import { completionSoundCandidates, resultRankFromTitle, sceneSkinPresentation } from '../../src/skin/sceneSkinPresentation.js';

describe('scene skin presentation', () => {
  it('maps pause and ranked results to the supplied Standard assets', () => {
    expect(sceneSkinPresentation('PAUSED')).toMatchObject({ artwork: 'pause-continue.png', panel: null });
    expect(sceneSkinPresentation('RESULT', 'S')).toMatchObject({ artwork: 'ranking-S.png', panel: 'ranking-panel.png', section: 'section-pass.png' });
  });

  it('maps an SS result to the YUGEN X ranking artwork', () => {
    expect(sceneSkinPresentation('RESULT', 'SS')).toMatchObject({ artwork: 'ranking-X.png' });
    expect(resultRankFromTitle('SS · 결과')).toBe('SS');
    expect(resultRankFromTitle('S · 결과')).toBe('S');
  });

  it('uses the map-local failure image before the skin failure section', () => {
    expect(sceneSkinPresentation('FAILED', null, true)).toMatchObject({ artwork: 'map:fail-background.png', section: 'section-fail.png' });
    expect(sceneSkinPresentation('FAILED', null, false).artwork).toBe('section-fail.png');
  });

  it('uses YUGEN applause for clear and map-local failure sound first for failure', () => {
    expect(completionSoundCandidates(true)).toEqual(['applause.mp3', 'sectionpass.wav']);
    expect(completionSoundCandidates(false)).toEqual(['failsound.wav', 'failsound.mp3', 'sectionfail.wav']);
  });
});
