export function createAudioUnlock(contextFactory) {
  let context = null;
  let unlocked = false;

  return async function unlockAudio() {
    context ??= contextFactory();

    if (!unlocked && context.state !== 'running') {
      await context.resume();
    }

    unlocked = true;
    return context;
  };
}

