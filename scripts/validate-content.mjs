// @ts-check

import process from 'node:process';
import { validatePreparedContent } from './lib/validate-prepared-content.mjs';

try {
  const result = await validatePreparedContent(process.cwd());
  console.log(`Validated ${result.contentFileCount} beatmap and ${result.skinFileCount} skin files.`);
  console.log(`Storyboard/audio references: ${result.storyboardReferences.total} total, ${result.storyboardReferences.unique} unique.`);
  console.log(`Production content: ${result.contentBytes} / ${35 * 1024 * 1024} bytes.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
