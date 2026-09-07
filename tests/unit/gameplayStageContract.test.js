// @ts-check

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('gameplay stage CSS contract', () => {
  it('uses the full viewport Canvas while the mapper preserves the 4:3 playfield', async () => {
    const css = await readFile(path.resolve('src/styles.css'), 'utf8');
    expect(css).toMatch(/#gameplay\s*\{[^}]*width:\s*100vw;/s);
    expect(css).toMatch(/#gameplay\s*\{[^}]*height:\s*100vh;/s);
    expect(css).not.toMatch(/#gameplay\s*\{[^}]*calc\(100vh\s*\*\s*4\s*\/\s*3\)/s);
    expect(css).toMatch(/\.is-gameflow \.menu-panel\s*\{[^}]*clip-path:\s*inset\(50%\)/s);
  });
});
