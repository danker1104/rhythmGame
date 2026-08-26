import { resolveContentUrl } from '../config/resolveContentUrl.js';

export class TextureLoadError extends Error {
  constructor(key, path, cause) {
    super(`필수 YUGEN 텍스처를 불러오지 못했습니다: ${path}`, { cause });
    this.name = 'TextureLoadError';
    this.resourceType = '스킨 텍스처';
    this.textureKey = key;
    this.path = path;
    this.retryable = true;
  }
}

export function loadBrowserImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image decode failed: ${url}`));
    image.src = url;
  });
}

export async function loadTextureSet({
  definitions,
  baseUrl = '/',
  pixelRatio = 1,
  imageLoader = loadBrowserImage,
  onWarning = () => {},
}) {
  const textures = {};

  for (const [key, definition] of Object.entries(definitions)) {
    const candidates = pixelRatio > 1 && definition.highDpiPath
      ? [{ path: definition.highDpiPath, scale: 0.5 }, { path: definition.path, scale: 1 }]
      : [{ path: definition.path, scale: 1 }];
    let lastError;

    for (const candidate of candidates) {
      try {
        textures[key] = {
          image: await imageLoader(resolveContentUrl(candidate.path, baseUrl)),
          path: candidate.path,
          scale: candidate.scale,
        };
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!textures[key]) {
      if (definition.required) throw new TextureLoadError(key, definition.path, lastError);
      textures[key] = null;
      onWarning(`선택 YUGEN 텍스처 ${definition.path}을(를) 기본 도형으로 대체합니다.`);
    }
  }

  return textures;
}

