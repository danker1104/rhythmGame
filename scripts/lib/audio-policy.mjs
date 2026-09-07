// @ts-check

const SILENT_SKIN_FILES = new Set([
  'drum-sliderslide.wav',
  'normal-sliderwhistle.wav',
]);

const REQUIRED_BEATMAP_AUDIO = new Set([
  'toby fox - UNDERTALE Soundtrack - 100 MEGALOVANIA 192.mp3',
]);

/**
 * @param {{
 *   sourceRoot: 'beatmap'|'skin',
 *   path: string,
 *   bytes: number,
 *   wavDataBytes: number|null,
 * }} file
 * @returns {'required'|'optional'|'silent'}
 */
export function classifyAudioPolicy(file) {
  const normalized = file.path.replaceAll('\\', '/');
  const lowerPath = normalized.toLocaleLowerCase('en-US');

  if (
    (file.sourceRoot === 'skin' && SILENT_SKIN_FILES.has(lowerPath)) ||
    (file.sourceRoot === 'beatmap' && lowerPath === 'soft-sliderslide.wav')
  ) {
    if (file.bytes === 0 || file.wavDataBytes === 0) return 'silent';
    throw new Error(`CONTENT_SILENCE_MISMATCH: ${file.path}`);
  }

  if (file.sourceRoot === 'beatmap' && REQUIRED_BEATMAP_AUDIO.has(normalized)) {
    return 'required';
  }

  return 'optional';
}

export const intentionalSilentSkinFiles = Object.freeze([...SILENT_SKIN_FILES]);
