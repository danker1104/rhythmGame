// @ts-check

import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import process from 'node:process';
import { validateBrowserEvidence } from './lib/browser-evidence.mjs';

try {
  const evidence = JSON.parse(await readFile(new URL('../release-evidence/browser-smoke-v1.json', import.meta.url), 'utf8'));
  const result = validateBrowserEvidence(evidence);
  console.log(`Browser Gate B evidence passes browser-smoke-v1 (${result.caseCount} cases).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
