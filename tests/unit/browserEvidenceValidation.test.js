// @ts-check

import { describe, expect, it } from 'vitest';
import { validateBrowserEvidence } from '../../scripts/lib/browser-evidence.mjs';

function completeEvidence() {
  return {
    checklistVersion: 'browser-smoke-v1',
    gateStatus: 'pass',
    cases: Array.from({ length: 12 }, (_, index) => ({
      id: `BS-${String(index + 1).padStart(2, '0')}`,
      browser: 'Browser 1', os: 'Windows', viewport: '1920x1080', executedAt: '2026-01-01T00:00:00Z',
      verifier: 'tester', expected: 'expected', actual: 'actual', status: 'pass', logPath: 'evidence.json',
    })),
  };
}

describe('validateBrowserEvidence', () => {
  it('accepts twelve complete passing cases', () => {
    expect(validateBrowserEvidence(completeEvidence())).toEqual({ caseCount: 12 });
  });

  it('rejects a pass marker with incomplete case evidence', () => {
    const evidence = completeEvidence();
    /** @type {any} */ (evidence.cases[0]).actual = undefined;
    expect(() => validateBrowserEvidence(evidence)).toThrow(/BROWSER_EVIDENCE_FIELDS_MISSING: BS-01/);
  });

  it('rejects a blocked required case', () => {
    const evidence = completeEvidence();
    evidence.cases[11].status = 'blocked';
    expect(() => validateBrowserEvidence(evidence)).toThrow(/BROWSER_GATE_INCOMPLETE: BS-12/);
  });
});
