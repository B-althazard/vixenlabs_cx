import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const userscriptPath = path.resolve(
  '/mnt/c/.alice/_xDev/git/vixenlabs_cx/public/vixenlabs-venice-bridge.user.js'
);

const userscript = readFileSync(userscriptPath, 'utf8');

describe('Venice userscript asset', () => {
  it('targets the Vixen Labs app route and Venice host', () => {
    expect(userscript).toContain('// @match        https://b-althazard.github.io/vixenlabs_cx/*');
    expect(userscript).toContain('// @match        https://venice.ai/*');
  });

  it('replays bridge updates through GM storage listeners on the app side', () => {
    expect(userscript).toContain('GM_addValueChangeListener(KEYS.STATUS');
    expect(userscript).toContain('GM_addValueChangeListener(KEYS.ERROR');
    expect(userscript).toContain('GM_addValueChangeListener(KEYS.RESULT_NONCE');
  });

  it('retries pending requests and prefers the newest unseen Venice image', () => {
    expect(userscript).toContain('replayPendingRequest()');
    expect(userscript).toContain('seenImageUrls');
    expect(userscript).toContain('images.reverse().find');
    expect(userscript).toContain("status: 'resuming-image-transfer'");
  });
});
