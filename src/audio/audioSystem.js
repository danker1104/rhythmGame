import { AudioClock } from './audioClock.js';
import { AudioEngine } from './audioEngine.js';
import { EffectManager } from './effectManager.js';

function clampVolume(value) {
  if (!Number.isFinite(value)) throw new TypeError('Volume must be a finite number');
  return Math.min(1, Math.max(0, value));
}

export function createAudioSystem(context, { maxEffectVoices = 8 } = {}) {
  const master = context.createGain();
  const music = context.createGain();
  const effect = context.createGain();

  music.connect(master);
  effect.connect(master);
  master.connect(context.destination);

  const clock = new AudioClock(context);
  const audioEngine = new AudioEngine(context, music, clock);
  const effects = new EffectManager(context, effect, { maxVoices: maxEffectVoices });

  return {
    context,
    clock,
    audioEngine,
    effects,
    gains: { master, music, effect },
    setMasterVolume(value) { master.gain.value = clampVolume(value); },
    setMusicVolume(value) { music.gain.value = clampVolume(value); },
    setEffectVolume(value) { effect.gain.value = clampVolume(value); },
  };
}
