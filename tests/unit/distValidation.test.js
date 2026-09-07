// @ts-check

import { describe, expect, it } from 'vitest';
import { validateDistEntries } from '../../scripts/lib/dist-validation.mjs';

const requiredEntries = [
  { path: 'index.html', bytes: 100 },
  { path: 'assets/index-abc.js', bytes: 200 },
  { path: 'assets/index-abc.css', bytes: 50 },
  { path: 'catalog/v1/catalog.json', bytes: 50 },
  { path: 'content/v1/megalovania/manifest.json', bytes: 50 },
  { path: 'skins/v3/yugen/manifest.json', bytes: 50 },
  { path: 'content-report.json', bytes: 50 },
];

describe('validateDistEntries', () => {
  it('summarizes an allowlisted static bundle', () => {
    const report = validateDistEntries(requiredEntries, 1_000);

    expect(report.totalBytes).toBe(550);
    expect(report.byRole).toEqual({ app: 350, catalog: 50, content: 50, report: 50, skin: 50 });
  });

  it.each(['desktop.ini', 'content/Thumbs.db'])('rejects forbidden file %s', (file) => {
    expect(() => validateDistEntries([...requiredEntries, { path: file, bytes: 1 }], 1_000)).toThrow(
      /DIST_FORBIDDEN_FILE/,
    );
  });

  it('rejects unexpected top-level output', () => {
    expect(() =>
      validateDistEntries([...requiredEntries, { path: 'server/index.js', bytes: 1 }], 1_000),
    ).toThrow(/DIST_PATH_NOT_ALLOWLISTED/);
  });

  it('rejects a bundle over budget', () => {
    expect(() => validateDistEntries(requiredEntries, 500)).toThrow(/DIST_BUDGET_EXCEEDED/);
  });

  it('requires the catalogs and manifests needed at runtime', () => {
    expect(() => validateDistEntries(requiredEntries.slice(0, -1), 1_000)).toThrow(/DIST_REQUIRED_PATH_MISSING/);
  });
});
