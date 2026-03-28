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
    expect(userscript).toContain('getLatestVeniceImageSrc()');
    expect(userscript).toContain('waitForNewVeniceImage(previousSrc)');
    expect(userscript).toContain('previousSrc');
    expect(userscript).toContain("status: 'resuming-image-transfer'");
  });

  it('captures image dimensions and waits for a post-submit image change', () => {
    expect(userscript).toContain('width: latestImage.naturalWidth || null');
    expect(userscript).toContain('height: latestImage.naturalHeight || null');
    expect(userscript).toContain('image transfer failed');
  });

  it('normalizes returned image payloads to png data urls', () => {
    expect(userscript).toContain("canvas.toDataURL('image/png')");
    expect(userscript).toContain("fetchedDataUrl.startsWith('data:image/webp')");
    expect(userscript).toContain("replace(/^data:image\\/webp/i, 'data:image/png')");
    expect(userscript).toContain("mime: 'image/png'");
  });

  it('marks processed nonces only after image publish succeeds', () => {
    const publishIndex = userscript.indexOf('publishImage({');
    const processedIndex = userscript.indexOf('GM_setValue(KEYS.LAST_PROCESSED_NONCE, job.nonce);');
    const listenerIndex = userscript.indexOf('GM_addValueChangeListener(KEYS.REQUEST_NONCE');
    const eagerProcessedIndex = userscript.indexOf('GM_setValue(KEYS.LAST_PROCESSED_NONCE, request.nonce);', listenerIndex);

    expect(publishIndex).toBeGreaterThan(-1);
    expect(processedIndex).toBeGreaterThan(publishIndex);
    expect(eagerProcessedIndex).toBe(-1);
  });
});
