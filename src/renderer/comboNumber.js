// @ts-check

/** @param {number} value @param {number} radius @param {number} [overlap] */
export function layoutComboDigits(value, radius, overlap = 0) {
  const digits = String(Math.max(0, Math.trunc(value))).split('').map(Number);
  const width = radius * 0.5;
  const height = radius * 0.7;
  const advance = width - overlap * radius / 64;
  const totalWidth = width + Math.max(0, digits.length - 1) * advance;
  const startX = -totalWidth / 2;
  return digits.map((digit, index) => ({ digit, x: startX + index * advance, width, height }));
}

/** @param {{parts?:Array<{kind:string,result:string|null}>}} slider */
export function sliderHeadShowsCombo(slider) {
  return slider.parts?.find((part) => part.kind === 'head')?.result === null;
}
