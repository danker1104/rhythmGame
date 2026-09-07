// @ts-check

import { describe, expect, it } from 'vitest';
import {
  buildExactCaseIndex,
  normalizeContentReference,
  resolveExactCase,
} from '../../scripts/lib/content-paths.mjs';

describe('content reference normalization', () => {
  it('normalizes map Windows separators without changing filename case', () => {
    expect(normalizeContentReference('SB\\Sans\\Frame 0.PNG')).toBe('SB/Sans/Frame 0.PNG');
  });

  it.each([
    '../skin.ini',
    'SB/../../skin.ini',
    '/absolute.png',
    'C:\\skin\\cursor.png',
    'https://example.test/asset.png',
    '%2e%2e/secret.wav',
    'SB/%2E%2E/secret.wav',
    'SB/%252e%252e/secret.wav',
  ])('rejects unsafe reference %s', (reference) => {
    expect(() => normalizeContentReference(reference)).toThrow('CONTENT_PATH_UNSAFE');
  });
});

describe('exact-case content index', () => {
  it('resolves a case-insensitive lookup to the actual case-sensitive path', () => {
    const index = buildExactCaseIndex(['SB/Frame.PNG', 'audio/hit.wav']);
    expect(resolveExactCase(index, 'sb/frame.png')).toBe('SB/Frame.PNG');
  });

  it('rejects files that differ only by case', () => {
    expect(() => buildExactCaseIndex(['SB/Frame.PNG', 'sb/frame.png'])).toThrow(
      'CONTENT_CASE_CONFLICT',
    );
  });
});
