import { DEFAULT_KEY_BINDINGS } from '../config/gameConfig.js';

export class InputManager {
  #target;
  #windowTarget;
  #documentTarget;
  #bindings;
  #onPress;
  #onRelease;
  #onPause;
  #active = false;
  #pressedLanes = new Set();

  constructor({
    target = document,
    windowTarget = window,
    documentTarget = document,
    keyBindings = DEFAULT_KEY_BINDINGS,
    onPress = () => {},
    onRelease = () => {},
    onPause = () => {},
  } = {}) {
    this.#target = target;
    this.#windowTarget = windowTarget;
    this.#documentTarget = documentTarget;
    this.#bindings = [...keyBindings];
    this.#onPress = onPress;
    this.#onRelease = onRelease;
    this.#onPause = onPause;
  }

  get pressedLanes() {
    return new Set(this.#pressedLanes);
  }

  #keydown = (event) => {
    if (!this.#active || event.repeat) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      this.#onPause();
      return;
    }
    const lane = this.#bindings.indexOf(event.code);
    if (lane === -1 || this.#pressedLanes.has(lane)) return;
    event.preventDefault();
    this.#pressedLanes.add(lane);
    this.#onPress(lane);
  };

  #keyup = (event) => {
    if (!this.#active) return;
    const lane = this.#bindings.indexOf(event.code);
    if (lane === -1 || !this.#pressedLanes.has(lane)) return;
    event.preventDefault();
    this.#pressedLanes.delete(lane);
    this.#onRelease(lane);
  };

  #visibilityChange = () => {
    if (this.#documentTarget.hidden) {
      this.clearPressed();
      this.#onPause();
    }
  };

  activate() {
    if (this.#active) return;
    this.#active = true;
    this.#target.addEventListener('keydown', this.#keydown);
    this.#target.addEventListener('keyup', this.#keyup);
    this.#windowTarget.addEventListener('blur', this.#blur);
    this.#documentTarget.addEventListener('visibilitychange', this.#visibilityChange);
  }

  #blur = () => {
    this.clearPressed();
    this.#onPause();
  };

  clearPressed() {
    for (const lane of this.#pressedLanes) this.#onRelease(lane);
    this.#pressedLanes.clear();
  }

  destroy() {
    if (!this.#active) return;
    this.clearPressed();
    this.#active = false;
    this.#target.removeEventListener('keydown', this.#keydown);
    this.#target.removeEventListener('keyup', this.#keyup);
    this.#windowTarget.removeEventListener('blur', this.#blur);
    this.#documentTarget.removeEventListener('visibilitychange', this.#visibilityChange);
  }
}
