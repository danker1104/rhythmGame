const SUPPORTED_DIFFICULTIES = new Set(['Easy', 'Normal', 'Hard', 'Insane']);

function parseSections(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Beatmap source must be a string');
  }

  const sections = new Map();
  let currentSection = null;

  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^\[([^\]]+)]$/);

    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections.set(currentSection, []);
      continue;
    }

    if (currentSection && line && !line.startsWith('//')) {
      sections.get(currentSection).push(line);
    }
  }

  return sections;
}

function parseKeyValues(lines = []) {
  const values = new Map();

  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  return values;
}

function requiredString(values, key, section) {
  const value = values.get(key);
  if (!value) throw new Error(`Missing ${section}.${key}`);
  return value;
}

function requiredNumber(values, key, section) {
  const value = Number(requiredString(values, key, section));
  if (!Number.isFinite(value)) throw new Error(`Invalid ${section}.${key}`);
  return value;
}

function normalizeContentFilename(filename, label) {
  const normalized = filename.trim().replaceAll('\\', '/');
  const segments = normalized.split('/');

  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.some((segment) => segment === '..' || segment === '')
  ) {
    throw new Error(`${label} must stay inside the content root`);
  }

  return normalized;
}

function parseBackgroundFilename(lines = []) {
  for (const line of lines) {
    const match = line.match(/^0\s*,\s*0\s*,\s*"([^"]+)"/);
    if (match) return normalizeContentFilename(match[1], 'The background filename');
  }
  throw new Error('Missing background filename');
}

function parseTimingPoints(lines = []) {
  return lines.map((line, index) => {
    const fields = line.split(',');
    const timeMs = Number(fields[0]);
    const beatLengthMs = Number(fields[1]);
    const meter = Number(fields[2]);
    const uninherited = Number(fields[6]);

    if (![timeMs, beatLengthMs, meter, uninherited].every(Number.isFinite)) {
      throw new Error(`Invalid timing point at index ${index}`);
    }

    return {
      timeMs,
      beatLengthMs,
      meter,
      uninherited: uninherited === 1,
    };
  });
}

export function laneFromX(x) {
  if (!Number.isFinite(x) || x < 0 || x > 511) {
    throw new RangeError('Mania x coordinate must be between 0 and 511');
  }
  return Math.min(3, Math.floor((x * 4) / 512));
}

function parseHitObjects(lines = [], onWarning) {
  const objects = [];

  lines.forEach((line, sourceOrder) => {
    const fields = line.split(',');
    const x = Number(fields[0]);
    const startTimeMs = Number(fields[2]);
    const type = Number(fields[3]);
    const hitSound = Number(fields[4]);

    if (![x, startTimeMs, type, hitSound].every(Number.isFinite)) {
      throw new Error(`Invalid hit object at index ${sourceOrder}`);
    }

    const isHold = (type & 128) !== 0;
    const isTap = (type & 1) !== 0;

    if (!isHold && !isTap) {
      onWarning?.(`Unsupported hit object type ${type} at index ${sourceOrder}`);
      return;
    }

    let endTimeMs = null;
    if (isHold) {
      endTimeMs = Number(fields[5]?.split(':', 1)[0]);
      if (!Number.isFinite(endTimeMs)) {
        throw new Error(`Invalid hold end time at index ${sourceOrder}`);
      }
      if (endTimeMs < startTimeMs) {
        throw new Error(`Hold end time cannot be earlier than its start at index ${sourceOrder}`);
      }
    }

    objects.push({
      id: sourceOrder,
      lane: laneFromX(x),
      startTimeMs,
      endTimeMs,
      kind: isHold ? 'hold' : 'tap',
      hitSound,
      sourceOrder,
    });
  });

  objects.sort(
    (left, right) =>
      left.startTimeMs - right.startTimeMs ||
      left.lane - right.lane ||
      left.sourceOrder - right.sourceOrder,
  );

  return objects.map(({ sourceOrder: _sourceOrder, ...object }) => object);
}

export function parseOsuBeatmap(text, { onWarning } = {}) {
  const sections = parseSections(text);
  const general = parseKeyValues(sections.get('General'));
  const metadata = parseKeyValues(sections.get('Metadata'));
  const difficulty = parseKeyValues(sections.get('Difficulty'));
  const mode = requiredNumber(general, 'Mode', 'General');
  const keyCount = requiredNumber(difficulty, 'CircleSize', 'Difficulty');

  if (mode !== 3) throw new Error(`Only Mania mode is supported; received Mode ${mode}`);
  if (keyCount !== 4) throw new Error(`Only 4Key beatmaps are supported; received ${keyCount} keys`);

  const difficultyName = requiredString(metadata, 'Version', 'Metadata');
  if (!SUPPORTED_DIFFICULTIES.has(difficultyName)) {
    onWarning?.(`Unexpected difficulty name: ${difficultyName}`);
  }

  return {
    beatmapId: requiredNumber(metadata, 'BeatmapID', 'Metadata'),
    setId: requiredNumber(metadata, 'BeatmapSetID', 'Metadata'),
    title: requiredString(metadata, 'Title', 'Metadata'),
    artist: requiredString(metadata, 'Artist', 'Metadata'),
    creator: requiredString(metadata, 'Creator', 'Metadata'),
    difficulty: difficultyName,
    mode,
    keyCount,
    audioFilename: normalizeContentFilename(
      requiredString(general, 'AudioFilename', 'General'),
      'AudioFilename',
    ),
    backgroundFilename: parseBackgroundFilename(sections.get('Events')),
    previewTimeMs: requiredNumber(general, 'PreviewTime', 'General'),
    hpDrainRate: requiredNumber(difficulty, 'HPDrainRate', 'Difficulty'),
    overallDifficulty: requiredNumber(difficulty, 'OverallDifficulty', 'Difficulty'),
    timingPoints: parseTimingPoints(sections.get('TimingPoints')),
    hitObjects: parseHitObjects(sections.get('HitObjects'), onWarning),
  };
}
