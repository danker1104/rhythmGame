// @ts-check

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildExactCaseIndex, normalizeContentReference, resolveExactCase } from './lib/content-paths.mjs';
import { createManifestEntry } from './lib/content-manifest.mjs';

const projectRoot = process.cwd();
const beatmapRoot = path.join(projectRoot, '387700 toby fox - MEGALOVANIA');
const skinRoot = path.join(projectRoot, '- YUGEN -');
const publicRoot = path.join(projectRoot, 'public');
const contentOutput = path.join(publicRoot, 'content', 'v1', 'megalovania');
const skinOutput = path.join(publicRoot, 'skins', 'v3', 'yugen');
const staleSkinOutputs = [
  path.join(publicRoot, 'skins', 'v1', 'azer8midnight'),
  path.join(publicRoot, 'skins', 'v2', 'azer8-midnight-edit'),
];
const catalogOutput = path.join(publicRoot, 'catalog', 'v1');

const beatmapFiles = [
  'toby fox - MEGALOVANIA (Kyshiro) [Easy].osu',
  'toby fox - MEGALOVANIA (Kyshiro) [Normal].osu',
  "toby fox - MEGALOVANIA (Kyshiro) [Irre's Light Hard].osu",
  'toby fox - MEGALOVANIA (Kyshiro) [Hard].osu',
  'toby fox - MEGALOVANIA (Kyshiro) [Insane].osu',
];

const baseBeatmapFiles = [
  ...beatmapFiles,
  'Toby Fox - MEGALOVANIA (Kyshiro).osb',
  'toby fox - UNDERTALE Soundtrack - 100 MEGALOVANIA 192.mp3',
  'MUDCoPU.jpg',
  'fail-background.png',
  'failsound.wav',
  'normal-hitclap.wav',
  'normal-hitwhistle.wav',
  'soft-sliderslide.wav',
];

const excludedStoryboardAssets = new Set([
  'SB/hp-burn.png',
  'SB/hp-extra.png',
  'SB/level-burn.png',
  'SB/level-extra.png',
]);

const exactSkinFiles = new Set([
  'Skin.ini',
  'cursor.png', 'cursortrail.png', 'cursor-smoke.png',
  'hitcircle.png', 'hitcircleoverlay.png', 'approachcircle.png',
  'sliderb0.png', 'sliderendcircle.png', 'sliderfollowcircle.png', 'reversearrow.png', 'sliderscorepoint.png',
  'followpoint-0.png', 'followpoint-1.png', 'followpoint-2.png', 'combo-x.png',
  'inputoverlay-background.png', 'inputoverlay-key.png',
  'scorebar-bg.png', 'scorebar-colour.png', 'scorebar-marker.png',
  'pause-back.png', 'pause-continue.png', 'pause-replay.png', 'pause-retry.png',
  'section-pass.png', 'section-fail.png', 'songselect-bottom.png', 'selection-tab.png',
  'mode-osu.png', 'mode-osu-med.png', 'mode-osu-small.png',
  'ranking-panel.png', 'ranking-graph.png', 'Ranking-title.png',
  'ranking-accuracy.png', 'ranking-maxcombo.png', 'ranking-perfect.png',
  'ranking-A.png', 'ranking-B.png', 'ranking-C.png', 'ranking-D.png',
  'ranking-S.png', 'ranking-X.png',
  'spinnerbonus.wav', 'spinnerspin.wav', 'combobreak.wav', 'sectionpass.wav', 'sectionfail.wav',
  'menuhit.wav', 'menuclick.wav', 'menuback.wav', 'whoosh.wav',
]);

const skinPrefixes = [
  'default-', 'followpoint-', 'hit0', 'hit50', 'hit100', 'hit300',
  'score-', 'spinner-',
];

const canonicalAudioPattern = /^(normal|soft|drum)-(hitnormal|hitwhistle|hitfinish|hitclap|sliderslide|sliderwhistle|slidertick)\.wav$/i;

/** @param {string} root */
async function listRelativeFiles(root) {
  /** @type {string[]} */
  const result = [];
  /** @param {string} current @param {string} relative */
  async function walk(current, relative) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en-US'));
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(child, childRelative);
      else if (entry.isFile()) result.push(childRelative);
    }
  }
  await walk(root, '');
  return result;
}

/** @param {string} root */
async function listDirectFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en-US'));
}

/** @param {string} text */
function parseStoryboardReferences(text) {
  /** @type {string[]} */
  const references = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('AudioFilename:')) {
      references.push(normalizeContentReference(line.slice('AudioFilename:'.length).trim()));
      continue;
    }
    if (!/^(Sprite|Animation|Sample|0,|2,)/.test(line)) continue;
    const quoted = line.match(/"([^"]+)"/);
    if (!quoted) continue;
    const reference = normalizeContentReference(quoted[1]);
    if (line.startsWith('Animation,')) {
      const fields = line.match(/(?:"[^"]*"|[^,])+/g) ?? [];
      const frameCount = Number(fields[6]);
      const extension = path.posix.extname(reference);
      const base = reference.slice(0, -extension.length);
      for (let frame = 0; frame < frameCount; frame += 1) {
        references.push(`${base}${frame}${extension}`);
      }
    } else {
      references.push(reference);
    }
  }
  return references;
}

/** @param {string} target */
function assertGeneratedTarget(target) {
  const relative = path.relative(publicRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative === '') {
    throw new Error(`CONTENT_OUTPUT_UNSAFE: ${target}`);
  }
}

/** @param {string} sourceRoot @param {string} outputRoot @param {string[]} files */
async function copyFiles(sourceRoot, outputRoot, files) {
  for (const relativePath of files) {
    const destination = path.join(outputRoot, ...relativePath.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(sourceRoot, ...relativePath.split('/')), destination);
  }
}

for (const staleSkinOutput of staleSkinOutputs) {
  assertGeneratedTarget(staleSkinOutput);
  await rm(staleSkinOutput, { recursive: true, force: true });
}

for (const target of [contentOutput, skinOutput, catalogOutput]) {
  assertGeneratedTarget(target);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
}

const beatmapSourceFiles = await listRelativeFiles(beatmapRoot);
const beatmapIndex = buildExactCaseIndex(beatmapSourceFiles);
const referenced = [];
for (const file of [...beatmapFiles, 'Toby Fox - MEGALOVANIA (Kyshiro).osb']) {
  referenced.push(...parseStoryboardReferences(await readFile(path.join(beatmapRoot, file), 'utf8')));
}

const beatmapClosure = new Set(baseBeatmapFiles);
for (const reference of referenced) {
  const exact = resolveExactCase(beatmapIndex, reference);
  if (!exact) throw new Error(`CONTENT_REFERENCE_MISSING: ${reference}`);
  beatmapClosure.add(exact);
}
for (const excluded of excludedStoryboardAssets) beatmapClosure.delete(excluded);
const contentFiles = [...beatmapClosure].sort((left, right) => left.localeCompare(right, 'en-US'));

const skinSourceFiles = await listDirectFiles(skinRoot);
buildExactCaseIndex(skinSourceFiles);
const skinFiles = skinSourceFiles
  .filter((file) => {
    const lower = file.toLocaleLowerCase('en-US');
    const standardResolutionName = lower.replace('@2x.png', '.png');
    return (
      exactSkinFiles.has(file) ||
      [...exactSkinFiles].some((name) => name.toLocaleLowerCase('en-US') === standardResolutionName) ||
      skinPrefixes.some((prefix) => lower.startsWith(prefix.toLocaleLowerCase('en-US'))) ||
      canonicalAudioPattern.test(file) ||
      lower.endsWith('.mp3')
    );
  })
  .sort((left, right) => left.localeCompare(right, 'en-US'));

await copyFiles(beatmapRoot, contentOutput, contentFiles);
await copyFiles(skinRoot, skinOutput, skinFiles);

const contentEntries = await Promise.all(
  contentFiles.map((relativePath) =>
    createManifestEntry({ sourceRoot: 'beatmap', sourceDirectory: beatmapRoot, relativePath }),
  ),
);
const skinEntries = await Promise.all(
  skinFiles.map((relativePath) =>
    createManifestEntry({ sourceRoot: 'skin', sourceDirectory: skinRoot, relativePath }),
  ),
);

const contentManifest = { schemaVersion: 1, contentVersion: 'v1', files: contentEntries };
const skinManifest = { schemaVersion: 1, contentVersion: 'v3', files: skinEntries };
await writeFile(path.join(contentOutput, 'manifest.json'), `${JSON.stringify(contentManifest, null, 2)}\n`);
await writeFile(path.join(skinOutput, 'manifest.json'), `${JSON.stringify(skinManifest, null, 2)}\n`);

const catalog = {
  schemaVersion: 1,
  defaultSkinId: 'yugen-v3',
  skins: [{ id: 'yugen-v3', root: 'skins/v3/yugen/', manifest: 'manifest.json', config: 'Skin.ini' }],
  songs: [{
    id: 'megalovania-387700', title: 'MEGALOVANIA', artist: 'toby fox', creator: 'Kyshiro',
    beatmapSetId: 387700, root: 'content/v1/megalovania/', manifest: 'manifest.json',
    audio: 'toby fox - UNDERTALE Soundtrack - 100 MEGALOVANIA 192.mp3', background: 'MUDCoPU.jpg',
    storyboard: 'Toby Fox - MEGALOVANIA (Kyshiro).osb', previewTimeMs: 15984,
    difficulties: [
      { id: 'easy', label: 'Easy', beatmapId: 848233, file: beatmapFiles[0] },
      { id: 'normal', label: 'Normal', beatmapId: 848235, file: beatmapFiles[1] },
      { id: 'irres-light-hard', label: "Irre's Light Hard", beatmapId: 882805, file: beatmapFiles[2] },
      { id: 'hard', label: 'Hard', beatmapId: 848234, file: beatmapFiles[3] },
      { id: 'insane', label: 'Insane', beatmapId: 847387, file: beatmapFiles[4] },
    ],
  }],
};
await writeFile(path.join(catalogOutput, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);

const allEntries = [...contentEntries, ...skinEntries];
const byRole = Object.fromEntries(
  [...new Set(allEntries.map((entry) => entry.role))]
    .sort()
    .map((role) => [role, allEntries.filter((entry) => entry.role === role).reduce((sum, entry) => sum + entry.bytes, 0)]),
);
const report = {
  schemaVersion: 1,
  budgetBytes: 35 * 1024 * 1024,
  contentBytes: allEntries.reduce((sum, entry) => sum + entry.bytes, 0),
  storyboardReferences: {
    total: referenced.length,
    unique: new Set(referenced.map((reference) => reference.toLocaleLowerCase('en-US'))).size,
  },
  byRole,
  files: allEntries.map(({ path: filePath, sourceRoot, role, bytes }) => ({ sourceRoot, path: filePath, role, bytes })),
};
await writeFile(path.join(publicRoot, 'content-report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Prepared ${contentEntries.length} beatmap and ${skinEntries.length} skin files.`);
console.log(`Content bytes: ${report.contentBytes} / ${report.budgetBytes}.`);
