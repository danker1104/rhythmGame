// @ts-check

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8').replace(/\s+/g, ' ');

describe('result layout contract', () => {
  it('uses the full viewport with a left statistics panel and right rank/actions', () => {
    expect(css).toMatch(/dialog\[data-scene="RESULT"\][^{]*\{[^}]*width:100vw[^}]*height:100dvh/);
    expect(css).toMatch(/dialog\[data-scene="RESULT"\] #dialog-content[^}]*grid-column:1/);
    expect(css).toMatch(/dialog\[data-scene="RESULT"\] \.dialog-artwork[^}]*grid-column:2/);
    expect(css).toMatch(/dialog\[data-scene="RESULT"\] \.dialog-actions[^}]*grid-column:2/);
    expect(css).toMatch(/\.result-header[^}]*grid-column:1\/-1/);
    expect(css).toMatch(/\.result-graph/);
  });
});
