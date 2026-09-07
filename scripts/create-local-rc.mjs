// @ts-check

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateBrowserEvidence } from './lib/browser-evidence.mjs';
import { listDistEntries, validateDistEntries } from './lib/dist-validation.mjs';
import { buildLocalRcReport } from './lib/local-rc-report.mjs';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const evidencePath = path.join(root, 'release-evidence', 'browser-smoke-v1.json');
const outputPath = path.join(root, 'release-evidence', 'local-rc-v1.json');
const budgetBytes = 35 * 1024 * 1024;

const browserEvidence = JSON.parse(await readFile(evidencePath, 'utf8'));
validateBrowserEvidence(browserEvidence);
const entries = (await listDistEntries(distRoot)).sort((left, right) => left.path.localeCompare(right.path));
const dist = validateDistEntries(entries, budgetBytes);
const digest = createHash('sha256');
for (const entry of entries) {
  digest.update(entry.path);
  digest.update('\0');
  digest.update(await readFile(path.join(distRoot, ...entry.path.split('/'))));
}
const report = buildLocalRcReport({
  generatedAt: new Date().toISOString(),
  gateA: 'pass',
  gateB: browserEvidence.gateStatus,
  dist: { ...dist, fileCount: entries.length, artifactSha256: digest.digest('hex') },
});
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Local RC ready: ${entries.length} files, ${dist.totalBytes} bytes.`);
console.log(`Evidence: ${path.relative(root, outputPath)}`);
