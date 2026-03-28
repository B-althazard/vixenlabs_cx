import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBridgeUserscript,
  getUserscriptUrl
} from '../src/lib/bridgeUserscript.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bridge userscript helpers', () => {
  it('builds the userscript URL from the Vite base path', () => {
    expect(getUserscriptUrl()).toMatch(/^\/vixenlabs_cx\/vixenlabs-venice-bridge\.user\.js\?v=/);
  });

  it('uses the same open flow for install and update delivery', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });

    expect(downloadBridgeUserscript()).toBe(true);
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/vixenlabs-venice-bridge\.user\.js\?v=/), '_blank', 'noopener');
  });
});
