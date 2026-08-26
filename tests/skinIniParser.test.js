import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { parseSkinIni4K } from '../src/skin/skinIniParser.js';

describe('parseSkinIni4K', () => {
  it('selects only the 4Key Mania block from the real YUGEN Skin.ini', async () => {
    const source = await readFile(new URL('../public/skins/yugen/Skin.ini', import.meta.url), 'utf8');
    const skin = parseSkinIni4K(source);

    expect(skin).toMatchObject({
      keys: 4,
      columnStart: 340,
      hitPosition: 400,
      scorePosition: 300,
      comboPosition: 275,
      lightFramePerSecond: 24,
      columnWidths: [45, 45, 45, 45],
    });
    expect(skin.columnColours).toEqual([
      [0, 0, 0, 240], [0, 0, 0, 240], [0, 0, 0, 240], [0, 0, 0, 240],
    ]);
    expect(skin.lightColours[0]).toEqual([102, 205, 107, 175]);
    expect(skin.lightColours[1]).toEqual([69, 188, 250, 175]);
  });

  it('rejects a skin without a 4Key Mania block', () => {
    expect(() => parseSkinIni4K('[Mania]\nKeys: 7\nColumnWidth: 36,36,36,36,36,36,36')).toThrow(
      '4Key Mania',
    );
  });
});

