// @ts-check

import { describe, expect, it } from 'vitest';
import { formatJudgementDiagnostic, JudgementDiagnostics } from '../../src/performance/judgementDiagnostics.js';

describe('JudgementDiagnostics', () => {
  it('keeps bounded structured press and applied-event evidence', () => {
    const diagnostics = new JudgementDiagnostics(2);
    diagnostics.record({ event: 'judgement_press', mapTimeMs: 100, result: 'no-candidate' });
    diagnostics.record({ event: 'judgement_press', mapTimeMs: 200, candidateId: 4, hitErrorMs: 12, distancePx: 8, result: '300' });
    diagnostics.record({
      event: 'judgement_applied',
      mapTimeMs: 200,
      objectId: 4,
      objectKind: 'circle',
      result: '300',
      before: { score: 0, combo: 0, health: 0.5 },
      after: { score: 300, combo: 1, health: 0.56 },
    });

    const snapshot = diagnostics.snapshot();
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.lastPress).toMatchObject({ candidateId: 4, hitErrorMs: 12, result: '300' });
    expect(snapshot.lastApplied).toMatchObject({
      objectId: 4,
      before: { score: 0, combo: 0, health: 0.5 },
      after: { score: 300, combo: 1, health: 0.56 },
    });
  });

  it('tracks timestamp fallback counts without storing unbounded labels', () => {
    const diagnostics = new JudgementDiagnostics();
    diagnostics.increment('INPUT_TIMESTAMP_FALLBACK');
    diagnostics.increment('INPUT_TIMESTAMP_FALLBACK');

    expect(diagnostics.snapshot().metrics).toEqual({ inputTimestampFallbacks: 2 });
  });

  it('formats the last decision as a compact debug HUD line', () => {
    expect(formatJudgementDiagnostic({
      event: 'judgement_press',
      candidateKind: 'circle',
      candidateId: 7,
      hitErrorMs: -12.4,
      distancePx: 18.2,
      result: '100',
    })).toBe('circle#7 Δ-12.4ms d18.2px => 100');
    expect(formatJudgementDiagnostic(null)).toBe('none');
  });
});
