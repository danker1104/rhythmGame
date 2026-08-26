import { describe, expect, it } from 'vitest';

import { GameSession } from '../src/engine/gameSession.js';

describe('GameSession', () => {
  it('applies judgement events to one shared score state', () => {
    const session = new GameSession([
      { id: 0, lane: 0, startTimeMs: 1000, endTimeMs: null, kind: 'tap', hitSound: 0 },
      { id: 1, lane: 1, startTimeMs: 1100, endTimeMs: null, kind: 'tap', hitSound: 0 },
    ]);

    session.press(0, 1000);
    session.update(1221);

    expect(session.score.judgements).toEqual({ perfect: 1, great: 0, good: 0, miss: 1 });
    expect(session.score.maxCombo).toBe(1);
    expect(session.score.combo).toBe(0);
  });
});
