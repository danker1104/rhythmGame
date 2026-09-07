// @ts-check

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildExactCaseIndex, normalizeContentReference, resolveExactCase } from './content-paths.mjs';
import { sha256 } from './content-manifest.mjs';

const BUDGET_BYTES = 35 * 1024 * 1024;
const FORBIDDEN_FILES = new Set([
  'desktop.ini',
  'thumbs.db',
  'SB/hp-burn.png',
  'SB/hp-extra.png',
  'SB/level-burn.png',
  'SB/level-extra.png',
]);

const YUGEN_TRANSPARENT_PNG = new Set([
  'comboburst.png', 'cursortrail.png', 'followpoint-0.png',
  'hit300-0.png', 'hit300-1.png', 'hit300g-0.png', 'hit300g-1.png', 'hit300k-0.png', 'hit300k-1.png',
  'lighting.png', 'ranking-accuracy.png', 'ranking-accuracy@2x.png', 'ranking-background-overlay.png',
  'ranking-maxcombo.png', 'ranking-maxcombo@2x.png', 'Ranking-title.png', 'ranking-winner.png', 'ready.png',
  'scorebar-bg.png', 'scorebar-bg@2x.png', 'scorebar-ki.png', 'scorebar-kidanger.png',
  'scorebar-kidanger2.png', 'sliderendcircle.png', 'sliderpoint10.png', 'sliderpoint30.png',
  'spinner-background.png', 'spinner-bottom.png', 'spinner-glow.png', 'spinner-middle.png',
  'spinner-middle2.png', 'spinner-middle2@2x.png', 'spinner-osu.png', 'spinner-spin.png',
  'spinner-top.png', 'triangle.png',
]);

/** @param {string} root */
async function listRelativeFiles(root) {
  /** @type {string[]} */
  const files = [];
  /** @param {string} directory @param {string} relative */
  async function walk(directory, relative) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(child, childRelative);
      else if (entry.isFile()) files.push(childRelative);
    }
  }
  await walk(root, '');
  return files;
}

/** @param {string} root */
async function listDirectFiles(root) {
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

/** @param {string} filePath */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/** @param {string} root @param {string[]} files */
async function inspectSkinSource(root, files) {
  const png = files.filter((file) => file.toLocaleLowerCase('en-US').endsWith('.png'));
  const jpg = files.filter((file) => /\.jpe?g$/i.test(file));
  const mp3 = files.filter((file) => file.toLocaleLowerCase('en-US').endsWith('.mp3'));
  const wav = files.filter((file) => file.toLocaleLowerCase('en-US').endsWith('.wav'));
  const ini = files.filter((file) => file.toLocaleLowerCase('en-US').endsWith('.ini'));
  const excludedMetadata = files.filter((file) => ['desktop.ini', 'thumbs.db'].includes(file.toLocaleLowerCase('en-US'))).sort();
  let oneByOnePng = 0;
  let bytes = 0;
  for (const file of files) bytes += (await stat(path.join(root, file))).size;
  for (const file of png) {
    const buffer = await readFile(path.join(root, ...file.split('/')));
    if (
      buffer.length >= 24 &&
      buffer.toString('ascii', 1, 4) === 'PNG' &&
      buffer.readUInt32BE(16) === 1 &&
      buffer.readUInt32BE(20) === 1
    ) oneByOnePng += 1;
  }
  return {
    directFiles: files.length,
    bytes,
    images: png.length + jpg.length,
    png: png.length,
    jpg: jpg.length,
    wav: wav.length,
    mp3: mp3.length,
    ini: ini.length,
    excludedMetadata,
    transparentPng: [...YUGEN_TRANSPARENT_PNG].filter((file) => files.includes(file)).length,
    oneByOnePng,
    explicitHighResolutionPng: png.filter((file) => /@2x\.png$/i.test(file)).length,
    uppercasePaths: files.filter((file) => /[A-Z]/.test(file)).length,
    caseConflicts: 0,
  };
}

/**
 * @param {{
 *   manifestPath: string,
 *   outputRoot: string,
 *   sourceRoot: string,
 *   expectedSourceRoot: 'beatmap'|'skin',
 * }} input
 */
async function validateManifest(input) {
  const manifest = await readJson(input.manifestPath);
  const expectedVersion = input.expectedSourceRoot === 'skin' ? 'v3' : 'v1';
  if (manifest.schemaVersion !== 1 || manifest.contentVersion !== expectedVersion || !Array.isArray(manifest.files)) {
    throw new Error(`CONTENT_MANIFEST_SCHEMA: ${input.manifestPath}`);
  }

  const sourceFiles = await listRelativeFiles(input.sourceRoot);
  const sourceIndex = buildExactCaseIndex(sourceFiles);
  const deployedFiles = (await listRelativeFiles(input.outputRoot)).filter((file) => file !== 'manifest.json');
  const deployedIndex = buildExactCaseIndex(deployedFiles);
  if (deployedFiles.length !== manifest.files.length) {
    throw new Error(`CONTENT_MANIFEST_FILE_COUNT: ${input.manifestPath}`);
  }

  for (const entry of manifest.files) {
    const relativePath = normalizeContentReference(entry.path);
    if (
      entry.sourceRoot !== input.expectedSourceRoot ||
      entry.sourceRelativePath !== relativePath ||
      entry.transformation !== 'copy'
    ) {
      throw new Error(`CONTENT_MANIFEST_ENTRY_INVALID: ${relativePath}`);
    }
    if (resolveExactCase(sourceIndex, relativePath) !== relativePath) {
      throw new Error(`CONTENT_SOURCE_CASE_MISMATCH: ${relativePath}`);
    }
    if (resolveExactCase(deployedIndex, relativePath) !== relativePath) {
      throw new Error(`CONTENT_DEPLOY_CASE_MISMATCH: ${relativePath}`);
    }
    if (FORBIDDEN_FILES.has(relativePath) || FORBIDDEN_FILES.has(relativePath.toLocaleLowerCase('en-US'))) {
      throw new Error(`CONTENT_FORBIDDEN_FILE: ${relativePath}`);
    }

    const source = await readFile(path.join(input.sourceRoot, ...relativePath.split('/')));
    const deployed = await readFile(path.join(input.outputRoot, ...relativePath.split('/')));
    const sourceDigest = sha256(source);
    const deployedDigest = sha256(deployed);
    if (
      entry.bytes !== deployed.length ||
      entry.sourceBytes !== source.length ||
      entry.sha256 !== deployedDigest ||
      entry.sourceSha256 !== sourceDigest ||
      deployedDigest !== sourceDigest
    ) {
      throw new Error(`CONTENT_HASH_OR_SIZE_MISMATCH: ${relativePath}`);
    }
    if (
      entry.role === 'audio' &&
      (!['required', 'optional', 'silent'].includes(entry.decodePolicy) ||
        typeof entry.codec !== 'string' ||
        typeof entry.durationMs !== 'number')
    ) {
      throw new Error(`CONTENT_AUDIO_METADATA_INVALID: ${relativePath}`);
    }
  }

  return manifest;
}

/** @param {string} projectRoot */
export async function validatePreparedContent(projectRoot) {
  const publicRoot = path.join(projectRoot, 'public');
  const contentRoot = path.join(publicRoot, 'content', 'v1', 'megalovania');
  const skinRoot = path.join(publicRoot, 'skins', 'v3', 'yugen');
  const catalog = await readJson(path.join(publicRoot, 'catalog', 'v1', 'catalog.json'));
  const report = await readJson(path.join(publicRoot, 'content-report.json'));
  if (
    catalog.schemaVersion !== 1 ||
    catalog.defaultSkinId !== 'yugen-v3' ||
    catalog.skins?.length !== 1 ||
    catalog.skins[0].root !== 'skins/v3/yugen/' ||
    catalog.skins[0].config !== 'Skin.ini' ||
    catalog.songs?.length !== 1 ||
    catalog.songs[0].difficulties?.length !== 5
  ) {
    throw new Error('CONTENT_CATALOG_SCHEMA');
  }

  const contentManifest = await validateManifest({
    manifestPath: path.join(contentRoot, 'manifest.json'),
    outputRoot: contentRoot,
    sourceRoot: path.join(projectRoot, '387700 toby fox - MEGALOVANIA'),
    expectedSourceRoot: 'beatmap',
  });
  const skinManifest = await validateManifest({
    manifestPath: path.join(skinRoot, 'manifest.json'),
    outputRoot: skinRoot,
    sourceRoot: path.join(projectRoot, '- YUGEN -'),
    expectedSourceRoot: 'skin',
  });
  const skinSourceRoot = path.join(projectRoot, '- YUGEN -');
  const skinSourceFiles = await listDirectFiles(skinSourceRoot);
  buildExactCaseIndex(skinSourceFiles);
  const skinSourceInventory = await inspectSkinSource(skinSourceRoot, skinSourceFiles);
  const sourcePathSet = new Set(skinSourceFiles.map((file) => file.toLocaleLowerCase('en-US')));
  const missingCanonicalSkinAudio = [
    'normal-hitnormal.wav', 'normal-hitwhistle.wav', 'normal-hitfinish.wav', 'normal-hitclap.wav',
    'normal-sliderslide.wav', 'normal-sliderwhistle.wav', 'normal-slidertick.wav',
    'soft-hitnormal.wav', 'soft-hitwhistle.wav', 'soft-hitfinish.wav', 'soft-hitclap.wav',
    'soft-sliderslide.wav', 'soft-sliderwhistle.wav', 'soft-slidertick.wav',
    'drum-hitnormal.wav', 'drum-hitwhistle.wav', 'drum-hitfinish.wav', 'drum-hitclap.wav',
    'drum-sliderslide.wav', 'drum-sliderwhistle.wav', 'drum-slidertick.wav',
  ].filter((file) => !sourcePathSet.has(file)).sort();

  const catalogFiles = [
    catalog.songs[0].audio,
    catalog.songs[0].background,
    catalog.songs[0].storyboard,
    ...catalog.songs[0].difficulties.map((/** @type {any} */ difficulty) => difficulty.file),
  ];
  const contentPaths = new Set(contentManifest.files.map((/** @type {any} */ entry) => entry.path));
  for (const catalogFile of catalogFiles) {
    if (!contentPaths.has(catalogFile)) throw new Error(`CONTENT_CATALOG_FILE_MISSING: ${catalogFile}`);
  }
  if (!skinManifest.files.some((/** @type {any} */ entry) => entry.path === catalog.skins[0].config)) {
    throw new Error(`CONTENT_CATALOG_FILE_MISSING: ${catalog.skins[0].config}`);
  }

  const calculatedBytes = [...contentManifest.files, ...skinManifest.files].reduce(
    (sum, entry) => sum + entry.bytes,
    0,
  );
  if (report.contentBytes !== calculatedBytes || calculatedBytes > BUDGET_BYTES) {
    throw new Error(`CONTENT_BUDGET_EXCEEDED: ${calculatedBytes}/${BUDGET_BYTES}`);
  }
  if (report.storyboardReferences?.total !== 82 || report.storyboardReferences?.unique !== 65) {
    throw new Error('CONTENT_REFERENCE_BASELINE_MISMATCH');
  }

  return {
    storyboardReferences: report.storyboardReferences,
    silentSkinAudio: skinManifest.files.filter((/** @type {any} */ entry) => entry.decodePolicy === 'silent').length,
    silentBeatmapAudio: contentManifest.files.filter((/** @type {any} */ entry) => entry.decodePolicy === 'silent').length,
    difficultyCount: catalog.songs[0].difficulties.length,
    contentBytes: calculatedBytes,
    contentFileCount: contentManifest.files.length,
    skinFileCount: skinManifest.files.length,
    skinSourceInventory,
    missingCanonicalSkinAudio,
  };
}
