// @ts-check

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('web interface quality contract', () => {
  it('declares theme colour and intrinsic sizes for every image', () => {
    expect(html).toContain('<meta name="theme-color" content="#05060b"');
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      expect(image[0]).toMatch(/\bwidth="\d+"/);
      expect(image[0]).toMatch(/\bheight="\d+"/);
      expect(image[0]).toMatch(/\balt=/);
    }
  });

  it('names settings controls and avoids unpausable infinite decoration', () => {
    for (const input of html.matchAll(/<input\b[^>]*>/g)) expect(input[0]).toMatch(/\bname="[^"]+"/);
    expect(css).not.toMatch(/animation:[^;]*infinite/);
    expect(css).not.toMatch(/transition:[^;]*(height|filter)/);
  });
});
