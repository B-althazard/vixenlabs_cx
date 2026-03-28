import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBridgeUserscript,
  getUserscriptUrl,
  openBridgeUserscript
} from '../src/lib/bridgeUserscript.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bridge userscript helpers', () => {
  it('builds the userscript URL from the Vite base path', () => {
    expect(getUserscriptUrl()).toBe('/vixenlabs_cx/vixenlabs-venice-bridge.user.js');
  });

  it('downloads the userscript through a temporary anchor', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const anchor = {
      href: '',
      download: '',
      rel: '',
      click,
      remove
    };

    vi.stubGlobal('document', {
      body: { appendChild },
      createElement: vi.fn(() => anchor)
    });

    vi.stubGlobal('window', {});

    expect(downloadBridgeUserscript()).toBe(true);
    expect(anchor.href).toBe('/vixenlabs_cx/vixenlabs-venice-bridge.user.js');
    expect(anchor.download).toBe('vixenlabs-venice-bridge.user.js');
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('opens the userscript in a new tab for extension installation flows', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });

    expect(openBridgeUserscript()).toBe(true);
    expect(open).toHaveBeenCalledWith(
      '/vixenlabs_cx/vixenlabs-venice-bridge.user.js',
      '_blank',
      'noopener'
    );
  });
});
