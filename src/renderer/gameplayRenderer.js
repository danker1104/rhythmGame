const LOGICAL_WIDTH = 640;
const LOGICAL_HEIGHT = 480;
const NOTE_MARGIN = 64;
const NOTE_HEIGHT = 20 * 0.8;

function rgba([red, green, blue, alpha]) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

function lowerBound(notes, timeMs) {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (notes[middle].startTimeMs < timeMs) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function noteY({ noteTimeMs, songTimeMs, hitPosition, pixelsPerMs }) {
  return hitPosition - (noteTimeMs - songTimeMs) * pixelsPerMs;
}

export class GameplayRenderer {
  #canvas;
  #context;
  #skin;
  #textures;
  #pixelRatio;
  #notes = [];
  #maxHoldDurationMs = 0;

  constructor(canvas, { skin, textures, pixelRatio = globalThis.devicePixelRatio || 1 }) {
    this.#canvas = canvas;
    this.#context = canvas.getContext('2d');
    this.#skin = skin;
    this.#textures = textures;
    this.#pixelRatio = Math.max(1, pixelRatio);
    this.resize();
  }

  resize() {
    this.#canvas.width = Math.round(LOGICAL_WIDTH * this.#pixelRatio);
    this.#canvas.height = Math.round(LOGICAL_HEIGHT * this.#pixelRatio);
    this.#canvas.style.aspectRatio = `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}`;
    this.#context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
  }

  setBeatmap(beatmap) {
    this.#notes = beatmap.hitObjects;
    this.#maxHoldDurationMs = this.#notes.reduce(
      (maximum, note) => Math.max(maximum, note.endTimeMs === null ? 0 : note.endTimeMs - note.startTimeMs),
      0,
    );
  }

  #laneX(lane) {
    let x = this.#skin.columnStart;
    for (let index = 0; index < lane; index += 1) x += this.#skin.columnWidths[index];
    return x;
  }

  #drawTexture(texture, x, y, width, height) {
    if (!texture?.image) return false;
    this.#context.drawImage(texture.image, x, y, width, height);
    return true;
  }

  #drawPlayfield(pressedLanes) {
    let x = this.#skin.columnStart;
    for (let lane = 0; lane < 4; lane += 1) {
      const width = this.#skin.columnWidths[lane];
      this.#context.fillStyle = rgba(this.#skin.columnColours[lane]);
      this.#context.fillRect(x, 0, width, LOGICAL_HEIGHT);
      x += width;
    }
    const playfieldWidth = x - this.#skin.columnStart;
    this.#drawTexture(this.#textures.stageLeft, this.#skin.columnStart - 12, 0, 12, LOGICAL_HEIGHT);
    this.#drawTexture(this.#textures.stageRight, x, 0, 12, LOGICAL_HEIGHT);
    this.#drawTexture(
      this.#textures.stageHint,
      this.#skin.columnStart,
      this.#skin.hitPosition - 32,
      playfieldWidth,
      64,
    );
    this.#context.fillStyle = 'rgba(255,255,255,0.42)';
    this.#context.fillRect(this.#skin.columnStart, this.#skin.hitPosition, playfieldWidth, 2);

    for (let lane = 0; lane < 4; lane += 1) {
      const width = this.#skin.columnWidths[lane];
      const outer = lane === 0 || lane === 3;
      const keyTexture = pressedLanes.has(lane)
        ? (outer ? this.#textures.keyOuterDown : this.#textures.keyInnerDown)
        : (outer ? this.#textures.keyOuter : this.#textures.keyInner);
      if (!this.#drawTexture(keyTexture, this.#laneX(lane), this.#skin.hitPosition, width, 48)) {
        this.#context.fillStyle = lane === 0 || lane === 3 ? '#66cd6b' : '#45bcfa';
        this.#context.fillRect(this.#laneX(lane), this.#skin.hitPosition, width, 48);
      }
    }
    this.#drawTexture(
      this.#textures.stageBottom,
      this.#skin.columnStart - 10,
      this.#skin.hitPosition + 48,
      playfieldWidth + 20,
      24,
    );
  }

  #drawNote(note, songTimeMs, pixelsPerMs) {
    const x = this.#laneX(note.lane);
    const width = this.#skin.columnWidths[note.lane];
    const outer = note.lane === 0 || note.lane === 3;
    const rawStartY = noteY({ noteTimeMs: note.startTimeMs, songTimeMs, hitPosition: this.#skin.hitPosition, pixelsPerMs });
    const y = note.kind === 'hold' ? Math.min(rawStartY, this.#skin.hitPosition) : rawStartY;

    if (note.kind === 'hold') {
      const endY = noteY({ noteTimeMs: note.endTimeMs, songTimeMs, hitPosition: this.#skin.hitPosition, pixelsPerMs });
      const bodyTop = Math.min(y, endY);
      const bodyHeight = Math.max(2, Math.abs(y - endY));
      const bodyTexture = outer ? this.#textures.holdOuterBody : this.#textures.holdInnerBody;
      if (!this.#drawTexture(bodyTexture, x, bodyTop, width, bodyHeight)) {
        this.#context.fillStyle = 'rgba(255,230,0,0.86)';
        this.#context.fillRect(x, bodyTop, width, bodyHeight);
      }
      const headTexture = outer ? this.#textures.holdOuterHead : this.#textures.holdInnerHead;
      this.#drawTexture(headTexture, x, endY - NOTE_HEIGHT / 2, width, NOTE_HEIGHT);
    }

    if (note.kind !== 'hold' || rawStartY < this.#skin.hitPosition) {
      const noteTexture = outer ? this.#textures.noteOuter : this.#textures.noteInner;
      if (!this.#drawTexture(noteTexture, x, y - NOTE_HEIGHT / 2, width, NOTE_HEIGHT)) {
        this.#context.fillStyle = outer ? '#66cd6b' : '#45bcfa';
        this.#context.fillRect(x, y - NOTE_HEIGHT / 2, width, NOTE_HEIGHT);
      }
    }
  }

  render({ songTimeMs, pixelsPerMs, pressedLanes = new Set(), hiddenNoteIds = new Set() }) {
    this.#context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.#drawPlayfield(pressedLanes);

    const pastWindowMs = (LOGICAL_HEIGHT - this.#skin.hitPosition + NOTE_MARGIN) / pixelsPerMs;
    const futureWindowMs = (this.#skin.hitPosition + NOTE_MARGIN) / pixelsPerMs;
    const start = lowerBound(this.#notes, songTimeMs - pastWindowMs - this.#maxHoldDurationMs);
    const end = lowerBound(this.#notes, songTimeMs + futureWindowMs);
    let visibleNotes = 0;

    for (let index = start; index < end; index += 1) {
      const note = this.#notes[index];
      if (hiddenNoteIds.has(note.id)) continue;
      if (note.kind === 'tap' && songTimeMs >= note.startTimeMs) continue;
      const y = noteY({ noteTimeMs: note.startTimeMs, songTimeMs, hitPosition: this.#skin.hitPosition, pixelsPerMs });
      const endY = note.endTimeMs === null ? y : noteY({
        noteTimeMs: note.endTimeMs,
        songTimeMs,
        hitPosition: this.#skin.hitPosition,
        pixelsPerMs,
      });
      if (Math.max(y, endY) < -NOTE_MARGIN || Math.min(y, endY) > LOGICAL_HEIGHT + NOTE_MARGIN) continue;
      this.#drawNote(note, songTimeMs, pixelsPerMs);
      visibleNotes += 1;
    }

    return { visibleNotes, totalNotes: this.#notes.length, rangeStart: start, rangeEnd: end };
  }
}
