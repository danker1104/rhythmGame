export const CONTENT = Object.freeze({
  song: Object.freeze({
    id: 'the-last-page',
    title: 'The Last Page',
    artist: 'ARForest',
    creator: 'PokeSky',
    audioPath: 'songs/the-last-page/audio.mp3',
    backgroundPath: 'songs/the-last-page/bg.jpg',
    previewTimeMs: 98_934,
    difficulties: Object.freeze([
      Object.freeze({ id: 'easy', label: 'Easy', beatmapId: 2654029, mapPath: 'songs/the-last-page/easy.osu', overallDifficulty: 6.5, hpDrainRate: 6.5, noteCount: 547, holdCount: 81 }),
      Object.freeze({ id: 'normal', label: 'Normal', beatmapId: 2652890, mapPath: 'songs/the-last-page/normal.osu', overallDifficulty: 7, hpDrainRate: 7, noteCount: 831, holdCount: 108 }),
      Object.freeze({ id: 'hard', label: 'Hard', beatmapId: 2652889, mapPath: 'songs/the-last-page/hard.osu', overallDifficulty: 7.5, hpDrainRate: 7.5, noteCount: 1214, holdCount: 25 }),
      Object.freeze({ id: 'insane', label: 'Insane', beatmapId: 2651800, mapPath: 'songs/the-last-page/insane.osu', overallDifficulty: 8, hpDrainRate: 8, noteCount: 1408, holdCount: 152 }),
    ]),
  }),
  skin: Object.freeze({
    id: 'yugen',
    iniPath: 'skins/yugen/Skin.ini',
    images: Object.freeze({
      menuBackground: 'skins/yugen/menu-background.jpg',
      menuButton: 'skins/yugen/menu-button-background.png',
      modeIcon: 'skins/yugen/mode-mania-small.png',
      noteOuter: 'skins/yugen/mania-note1.png',
      noteInner: 'skins/yugen/mania-note2.png',
      holdOuterHead: 'skins/yugen/mania-note1H.png',
      holdOuterBody: 'skins/yugen/mania-note1L.png',
      holdInnerHead: 'skins/yugen/mania-note2H.png',
      holdInnerBody: 'skins/yugen/mania-note2L.png',
      keyOuter: 'skins/yugen/mania-key1.png',
      keyInner: 'skins/yugen/mania-key2.png',
      keyOuterDown: 'skins/yugen/mania-key1D.png',
      keyInnerDown: 'skins/yugen/mania-key2D.png',
      stageLeft: 'skins/yugen/mania-stage-left.png',
      stageRight: 'skins/yugen/mania-stage-right.png',
      stageBottom: 'skins/yugen/mania-stage-bottom.png',
      stageBottom2x: 'skins/yugen/mania-stage-bottom@2x.png',
      stageHint: 'skins/yugen/mania-stage-hint.png',
      stageLight: 'skins/yugen/mania-stage-light.png',
    }),
    effects: Object.freeze({
      welcome: 'skins/yugen/welcome.wav',
      menuClick: 'skins/yugen/menuclick.wav',
      hitNormal: 'skins/yugen/soft-hitnormal.wav',
    }),
  }),
});

export function getDeployableAssetPaths() {
  return [
    CONTENT.song.audioPath,
    CONTENT.song.backgroundPath,
    ...CONTENT.song.difficulties.map(({ mapPath }) => mapPath),
    CONTENT.skin.iniPath,
    ...Object.values(CONTENT.skin.images),
    ...Object.values(CONTENT.skin.effects),
  ];
}
