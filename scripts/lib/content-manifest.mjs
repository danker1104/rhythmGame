// @ts-check

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { classifyAudioPolicy } from './audio-policy.mjs';

/** @type {Readonly<Record<string, string>>} */
const MEDIA_TYPES = Object.freeze({
  '.ini': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.osb': 'text/plain; charset=utf-8',
  '.osu': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
});

/** @param {Buffer} buffer */
export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** @param {string} filePath */
export function mediaTypeFor(filePath) {
  const mediaType = MEDIA_TYPES[path.extname(filePath).toLocaleLowerCase('en-US')];
  if (!mediaType) throw new Error(`CONTENT_MEDIA_TYPE_UNSUPPORTED: ${filePath}`);
  return mediaType;
}

/** @param {string} filePath */
export function roleFor(filePath) {
  const extension = path.extname(filePath).toLocaleLowerCase('en-US');
  if (extension === '.osu') return 'beatmap';
  if (extension === '.osb') return 'storyboard';
  if (extension === '.ini') return 'skin-config';
  if (extension === '.mp3' || extension === '.wav') return 'audio';
  if (extension === '.png' || extension === '.jpg' || extension === '.jpeg') return 'image';
  throw new Error(`CONTENT_ROLE_UNSUPPORTED: ${filePath}`);
}

/**
 * @param {Buffer} buffer
 * @returns {{ codec: string, durationMs: number, dataBytes: number }|null}
 */
export function inspectWav(buffer) {
  if (buffer.length === 0) return { codec: 'wav-empty', durationMs: 0, dataBytes: 0 };
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('CONTENT_WAV_INVALID');
  }

  let offset = 12;
  let format = 0;
  let sampleRate = 0;
  let byteRate = 0;
  let factSamples = 0;
  let dataBytes = -1;

  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (body + chunkSize > buffer.length) break;
    if (chunk === 'fmt ' && chunkSize >= 16) {
      format = buffer.readUInt16LE(body);
      sampleRate = buffer.readUInt32LE(body + 4);
      byteRate = buffer.readUInt32LE(body + 8);
    } else if (chunk === 'fact' && chunkSize >= 4) {
      factSamples = buffer.readUInt32LE(body);
    } else if (chunk === 'data') {
      dataBytes = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (dataBytes < 0) throw new Error('CONTENT_WAV_DATA_MISSING');
  const durationMs =
    sampleRate > 0 && factSamples > 0
      ? Math.round((factSamples / sampleRate) * 1000)
      : byteRate > 0
        ? Math.round((dataBytes / byteRate) * 1000)
        : 0;
  const codec = format === 1 ? 'pcm' : format === 2 ? 'ms-adpcm' : `wav-format-${format}`;
  return { codec, durationMs, dataBytes };
}

/**
 * @param {{ sourceRoot: 'beatmap'|'skin', sourceDirectory: string, relativePath: string }} input
 */
export async function createManifestEntry(input) {
  const absolutePath = path.join(input.sourceDirectory, ...input.relativePath.split('/'));
  const buffer = await readFile(absolutePath);
  const digest = sha256(buffer);
  const entry = {
    path: input.relativePath,
    sourceRoot: input.sourceRoot,
    sourceRelativePath: input.relativePath,
    transformation: 'copy',
    role: roleFor(input.relativePath),
    bytes: buffer.length,
    sourceBytes: buffer.length,
    mediaType: mediaTypeFor(input.relativePath),
    sha256: digest,
    sourceSha256: digest,
  };

  if (entry.role !== 'audio') return entry;

  const extension = path.extname(input.relativePath).toLocaleLowerCase('en-US');
  const wav = extension === '.wav' ? inspectWav(buffer) : null;
  const durationMs =
    extension === '.mp3' && input.sourceRoot === 'beatmap'
      ? 156_055
      : wav?.durationMs ?? 0;
  return {
    ...entry,
    codec: extension === '.mp3' ? 'mp3' : (wav?.codec ?? 'wav'),
    durationMs,
    decodePolicy: classifyAudioPolicy({
      sourceRoot: input.sourceRoot,
      path: input.relativePath,
      bytes: buffer.length,
      wavDataBytes: wav?.dataBytes ?? null,
    }),
  };
}
