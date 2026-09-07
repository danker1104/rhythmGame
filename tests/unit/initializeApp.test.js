// @ts-check

import { describe, expect, it, vi } from 'vitest';
import { initializeApp } from '../../src/app/initializeApp.js';

describe('initializeApp', () => {
  it('offers a working retry after catalog initialization fails', async () => {
    const app = { initialize: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined) };
    const status = { textContent: '' };
    const startButton = { disabled: true, textContent: '' };
    /** @type {Array<()=>Promise<boolean>>} */
    const retries = [];

    expect(await initializeApp(app, { status, startButton, setRetry: (handler) => { if (handler) retries.push(handler); } })).toBe(false);
    expect(status.textContent).toBe('초기화 실패: offline');
    expect(startButton).toMatchObject({ disabled: false, textContent: '다시 시도' });

    expect(await retries[0]()).toBe(true);
    expect(app.initialize).toHaveBeenCalledTimes(2);
  });
});
