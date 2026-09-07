// @ts-check

import { describe, expect, it } from 'vitest';
import { buildLocalRcReport } from '../../scripts/lib/local-rc-report.mjs';

describe('buildLocalRcReport', () => {
  it('marks a static artifact ready only when Gate A and Gate B pass', () => {
    const report = buildLocalRcReport({
      generatedAt: '2026-01-01T00:00:00Z', gateA: 'pass', gateB: 'pass',
      dist: { totalBytes: 100, budgetBytes: 200, fileCount: 3, artifactSha256: 'a'.repeat(64) },
    });
    expect(report).toMatchObject({ candidateStatus: 'pass', serverRuntimeRequired: false });
  });

  it('rejects creation when either release gate is incomplete', () => {
    expect(() => buildLocalRcReport({
      generatedAt: '2026-01-01T00:00:00Z', gateA: 'pass', gateB: 'blocked',
      dist: { totalBytes: 100, budgetBytes: 200, fileCount: 3, artifactSha256: 'a'.repeat(64) },
    })).toThrow(/LOCAL_RC_GATE_INCOMPLETE/);
  });
});
