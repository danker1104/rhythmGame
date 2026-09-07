// @ts-check

import path from 'node:path';

const DRIVE_LETTER = /^[a-zA-Z]:[\\/]/;
const URL_SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

/**
 * @param {string} reference
 * @returns {string}
 */
export function normalizeContentReference(reference) {
  const normalizedSlashes = reference.replaceAll('\\', '/');
  let decoded = normalizedSlashes;

  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      throw new Error(`CONTENT_PATH_UNSAFE: malformed encoding in ${reference}`);
    }
  }

  const decodedSlashes = decoded.replaceAll('\\', '/');
  const segments = decodedSlashes.split('/');
  const isUnsafe =
    reference.length === 0 ||
    path.posix.isAbsolute(decodedSlashes) ||
    DRIVE_LETTER.test(decodedSlashes) ||
    URL_SCHEME.test(decodedSlashes) ||
    segments.some((segment) => segment === '..' || segment === '.');

  if (isUnsafe) {
    throw new Error(`CONTENT_PATH_UNSAFE: ${reference}`);
  }

  return normalizedSlashes;
}

/**
 * @param {string[]} paths
 * @returns {Map<string, string>}
 */
export function buildExactCaseIndex(paths) {
  const index = new Map();

  for (const candidate of paths) {
    const normalized = normalizeContentReference(candidate);
    const key = normalized.toLocaleLowerCase('en-US');
    const existing = index.get(key);
    if (existing && existing !== normalized) {
      throw new Error(`CONTENT_CASE_CONFLICT: ${existing} <> ${normalized}`);
    }
    index.set(key, normalized);
  }

  return index;
}

/**
 * @param {Map<string, string>} index
 * @param {string} reference
 * @returns {string|null}
 */
export function resolveExactCase(index, reference) {
  const normalized = normalizeContentReference(reference);
  return index.get(normalized.toLocaleLowerCase('en-US')) ?? null;
}
