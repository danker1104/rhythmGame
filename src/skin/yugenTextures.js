import { CONTENT } from '../config/contentManifest.js';

const image = CONTENT.skin.images;

export const YUGEN_TEXTURES = Object.freeze({
  noteOuter: { path: image.noteOuter, required: true },
  noteInner: { path: image.noteInner, required: true },
  holdOuterHead: { path: image.holdOuterHead, required: true },
  holdOuterBody: { path: image.holdOuterBody, required: true },
  holdInnerHead: { path: image.holdInnerHead, required: true },
  holdInnerBody: { path: image.holdInnerBody, required: true },
  keyOuter: { path: image.keyOuter, required: false },
  keyInner: { path: image.keyInner, required: false },
  keyOuterDown: { path: image.keyOuterDown, required: false },
  keyInnerDown: { path: image.keyInnerDown, required: false },
  stageLeft: { path: image.stageLeft, required: false },
  stageRight: { path: image.stageRight, required: false },
  stageBottom: { path: image.stageBottom, highDpiPath: image.stageBottom2x, required: false },
  stageHint: { path: image.stageHint, required: false },
  stageLight: { path: image.stageLight, required: false },
});

