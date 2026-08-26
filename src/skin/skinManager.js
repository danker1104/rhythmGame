import { CONTENT } from '../config/contentManifest.js';
import { resolveContentUrl } from '../config/resolveContentUrl.js';
import { parseSkinIni4K } from './skinIniParser.js';
import { loadTextureSet } from './textureLoader.js';
import { YUGEN_TEXTURES } from './yugenTextures.js';

export async function loadYugenSkin({
  baseUrl = '/',
  pixelRatio = globalThis.devicePixelRatio || 1,
  fetchImpl = globalThis.fetch,
  imageLoader,
  onWarning = () => {},
} = {}) {
  const response = await fetchImpl(resolveContentUrl(CONTENT.skin.iniPath, baseUrl));
  if (!response.ok) {
    const error = new Error(`YUGEN Skin.ini 요청이 실패했습니다. (HTTP ${response.status})`);
    error.resourceType = '스킨 설정';
    error.path = CONTENT.skin.iniPath;
    throw error;
  }

  const skin = parseSkinIni4K(await response.text());
  const textures = await loadTextureSet({
    definitions: YUGEN_TEXTURES,
    baseUrl,
    pixelRatio,
    imageLoader,
    onWarning,
  });
  return { skin, textures };
}
