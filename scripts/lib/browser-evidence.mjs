// @ts-check

const REQUIRED_FIELDS = ['browser', 'os', 'viewport', 'executedAt', 'verifier', 'expected', 'actual', 'logPath'];

/** @param {any} evidence */
export function validateBrowserEvidence(evidence) {
  if (evidence?.checklistVersion !== 'browser-smoke-v1' || evidence?.gateStatus !== 'pass') {
    throw new Error('BROWSER_EVIDENCE_SCHEMA_OR_GATE_INVALID');
  }
  const expected = Array.from({ length: 12 }, (_, index) => `BS-${String(index + 1).padStart(2, '0')}`);
  const cases = new Map(evidence.cases?.map((/** @type {any} */ entry) => [entry.id, entry]) ?? []);
  for (const id of expected) {
    const entry = cases.get(id);
    if (entry?.status !== 'pass') throw new Error(`BROWSER_GATE_INCOMPLETE: ${id}`);
    const missing = REQUIRED_FIELDS.filter((field) => typeof entry[field] !== 'string' || entry[field].length === 0);
    if (missing.length > 0) throw new Error(`BROWSER_EVIDENCE_FIELDS_MISSING: ${id}: ${missing.join(', ')}`);
  }
  return { caseCount: expected.length };
}
