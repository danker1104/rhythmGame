import { describe, expect, it, vi } from 'vitest';

import { createAudioUnlock } from '../src/audio/audioUnlock.js';

describe('audio unlock', () => {
  it('creates and resumes one AudioContext from a user action', async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const context = { state: 'suspended', resume };
    const factory = vi.fn(() => context);
    const unlock = createAudioUnlock(factory);

    await expect(unlock()).resolves.toBe(context);
    await expect(unlock()).resolves.toBe(context);

    expect(factory).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
  });
});

