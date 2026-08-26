const TRANSITIONS = Object.freeze({
  BOOT: new Set(['MENU']),
  MENU: new Set(['DIFFICULTY_SELECT', 'SETTINGS']),
  SETTINGS: new Set(['MENU']),
  DIFFICULTY_SELECT: new Set(['MENU', 'LOADING']),
  LOADING: new Set(['READY', 'ERROR', 'DIFFICULTY_SELECT']),
  ERROR: new Set(['LOADING', 'DIFFICULTY_SELECT']),
  READY: new Set(['LOADING', 'DIFFICULTY_SELECT', 'VISUAL_PREVIEW', 'PLAYING']),
  VISUAL_PREVIEW: new Set(['READY', 'DIFFICULTY_SELECT']),
  PLAYING: new Set(['READY', 'PAUSED', 'RESULT']),
  PAUSED: new Set(['PLAYING', 'READY', 'DIFFICULTY_SELECT']),
  RESULT: new Set(['READY', 'DIFFICULTY_SELECT']),
});

export function createSceneManager(initialScene = 'BOOT') {
  if (!(initialScene in TRANSITIONS)) throw new Error(`Unknown scene: ${initialScene}`);

  let current = initialScene;

  return {
    get current() {
      return current;
    },
    transitionTo(nextScene) {
      if (!TRANSITIONS[current]?.has(nextScene)) {
        throw new Error(`Invalid scene transition: ${current} → ${nextScene}`);
      }
      current = nextScene;
      return current;
    },
  };
}
