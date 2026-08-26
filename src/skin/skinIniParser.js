function parseBlocks(source) {
  const blocks = [];
  let current = null;

  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;
    const section = line.match(/^\[([^\]]+)]$/);
    if (section) {
      current = { name: section[1], values: new Map() };
      blocks.push(current);
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    current.values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return blocks;
}

function numberValue(values, key) {
  const value = Number(values.get(key));
  if (!Number.isFinite(value)) throw new Error(`Invalid 4Key Mania value: ${key}`);
  return value;
}

function numberList(values, key, length) {
  const result = (values.get(key) ?? '').split(',').map(Number);
  if (result.length !== length || result.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid 4Key Mania value: ${key}`);
  }
  return result;
}

export function parseSkinIni4K(source) {
  if (typeof source !== 'string') throw new TypeError('Skin.ini source must be a string');
  const block = parseBlocks(source).find(({ name, values }) => name === 'Mania' && Number(values.get('Keys')) === 4);
  if (!block) throw new Error('Skin.ini does not contain a 4Key Mania block');

  const { values } = block;
  return {
    keys: 4,
    columnStart: numberValue(values, 'ColumnStart'),
    hitPosition: numberValue(values, 'HitPosition'),
    scorePosition: numberValue(values, 'ScorePosition'),
    comboPosition: numberValue(values, 'ComboPosition'),
    lightFramePerSecond: numberValue(values, 'LightFramePerSecond'),
    columnWidths: numberList(values, 'ColumnWidth', 4),
    columnLineWidths: numberList(values, 'ColumnLineWidth', 5),
    columnColours: Array.from({ length: 4 }, (_, index) => numberList(values, `Colour${index + 1}`, 4)),
    lightColours: Array.from({ length: 4 }, (_, index) => numberList(values, `ColourLight${index + 1}`, 4)),
    holdColour: numberList(values, 'ColourHold', 4),
  };
}

