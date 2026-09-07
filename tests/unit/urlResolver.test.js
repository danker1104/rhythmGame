// @ts-check

import { describe, expect, it } from 'vitest';
import { resolvePublicAsset } from '../../src/catalog/urlResolver.js';

describe('public asset URL resolver', () => {
  it('resolves under the Vite base path and URL-encodes filename characters', () => {
    expect(
      resolvePublicAsset('/preview/build-42/', 'content/v1/megalovania/', "Irre's Map.osu"),
    ).toBe('/preview/build-42/content/v1/megalovania/Irre%27s%20Map.osu');
  });

  it('normalizes map separators', () => {
    expect(resolvePublicAsset('/', 'content/v1/megalovania/', 'SB\\Text\\line.png')).toBe(
      '/content/v1/megalovania/SB/Text/line.png',
    );
  });

  it.each(['../secret', '/absolute.png', 'C:\\asset.png', '%2e%2e/secret']) (
    'rejects unsafe runtime path %s',
    (relativePath) => {
      expect(() => resolvePublicAsset('/', 'content/v1/', relativePath)).toThrow('CONTENT_PATH_UNSAFE');
    },
  );
});
