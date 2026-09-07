// @ts-check

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../src/app/circleSliceApp.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8').replace(/\s+/g, ' ');

describe('song selection motion contract', () => {
  it('provides explicit previous/next controls and keeps keyed cards alive for transitions', () => {
    expect(html).toContain('id="difficulty-previous"');
    expect(html).toContain('id="difficulty-next"');
    expect(appSource).toContain("rail.querySelectorAll('.difficulty-card')");
    expect(appSource).toContain('existing.get(item.id)');
    expect(appSource).not.toContain('rail.replaceChildren(...items.map');
  });

  it('uses a full viewport menu without the map background artwork', () => {
    expect(css).toMatch(/\.menu-panel\s*\{[^}]*width:100vw/);
    expect(appSource).not.toContain("style.setProperty('--selection-background'");
  });
});
