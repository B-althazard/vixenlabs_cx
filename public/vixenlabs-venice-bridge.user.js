// ==UserScript==
// @name         Vixen Labs CX -> Venice Bridge
// @namespace    https://b-althazard.github.io/
// @version      1.1.0
// @description  Bridges Vixen Labs CX to Venice.ai for automated image generation
// @match        https://b-althazard.github.io/vixenlabs_cx/*
// @match        https://venice.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const APP_URL_RE = /^https:\/\/b-althazard\.github\.io\/vixenlabs_cx\//i;
  const VENICE_HOST_RE = /(^|\.)venice\.ai$/i;

  const KEYS = {
    REQUEST: 'vixenlabs_v1_request',
    REQUEST_NONCE: 'vixenlabs_v1_request_nonce',
    RESULT: 'vixenlabs_v1_result',
    RESULT_NONCE: 'vixenlabs_v1_result_nonce',
    STATUS: 'vixenlabs_v1_status',
    ERROR: 'vixenlabs_v1_error',
    TIMESTAMP: 'vixenlabs_v1_timestamp',
    LAST_PROCESSED_NONCE: 'vixenlabs_v1_last_processed_nonce',
    HEARTBEAT_APP: 'vixenlabs_v1_heartbeat_app',
    HEARTBEAT_VENICE: 'vixenlabs_v1_heartbeat_venice',
    LAST_TRANSFER_TS: 'vixenlabs_v1_last_transfer_ts',
    ACTIVE_JOB: 'vixenlabs_v1_active_job'
  };

  const BRIDGE_EVENTS = {
    generate: 'xgen:generate',
    ready: 'xgen:bridge-ready',
    status: 'xgen:status-update',
    error: 'xgen:generation-error',
    image: 'xgen:image-received',
    heartbeat: 'xgen:bridge-heartbeat'
  };

  const SELECTORS = {
    veniceTextarea: [
      'textarea[name="prompt-textarea"]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="message" i]',
      'form textarea',
      'textarea'
    ],
    veniceSubmit: [
      'button[type="submit"][aria-label="Submit chat"]',
      'button[type="submit"][aria-label*="send" i]',
      'button[aria-label*="submit" i]',
      'button[aria-label*="send" i]',
      'form button[type="submit"]'
    ],
    veniceImage: [
      '[data-message-author-role="assistant"] img[src^="blob:"]',
      '[data-role="assistant"] img[src^="blob:"]',
      '.image-message img',
      'img[alt*="generated" i]',
      'img[src^="blob:"]',
      'main img'
    ]
  };

  const CONFIG = {
    submitWaitMs: 10000,
    textareaWaitMs: 20000,
    imageWaitMs: 120000,
    heartbeatMs: 1500,
    connectionFreshMs: 4500,
    clickDelayMs: 80,
    replayWaitMs: 600
  };

  function isApp() {
    return APP_URL_RE.test(window.location.href);
  }

  function isVenice() {
    return VENICE_HOST_RE.test(window.location.hostname);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function queryFirst(selectors, root = document) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const found = root.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  async function waitForElement(selectors, timeoutMs, intervalMs = 150) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = queryFirst(selectors);
      if (el) {
        return el;
      }
      await sleep(intervalMs);
    }
    return null;
  }

  function dispatchPageEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function publishStatus(payload) {
    GM_setValue(KEYS.STATUS, payload);
    GM_setValue(KEYS.TIMESTAMP, Date.now());
    dispatchPageEvent(BRIDGE_EVENTS.status, payload);
  }

  function publishError(payload) {
    GM_setValue(KEYS.ERROR, payload);
    GM_setValue(KEYS.TIMESTAMP, Date.now());
    dispatchPageEvent(BRIDGE_EVENTS.error, payload);
  }

  function publishImage(payload) {
    GM_setValue(KEYS.RESULT_NONCE, payload?.nonce || null);
    GM_setValue(KEYS.RESULT, payload || null);
    GM_setValue(KEYS.LAST_TRANSFER_TS, Date.now());
    dispatchPageEvent(BRIDGE_EVENTS.image, payload);
  }

  function publishReady(detail = {}) {
    dispatchPageEvent(BRIDGE_EVENTS.ready, detail);
  }

  function publishHeartbeat(detail = {}) {
    dispatchPageEvent(BRIDGE_EVENTS.heartbeat, detail);
  }

  function otherHeartbeatKey() {
    return isApp() ? KEYS.HEARTBEAT_VENICE : KEYS.HEARTBEAT_APP;
  }

  function ownHeartbeatKey() {
    return isApp() ? KEYS.HEARTBEAT_APP : KEYS.HEARTBEAT_VENICE;
  }

  function setActiveJob(job) {
    GM_setValue(KEYS.ACTIVE_JOB, {
      ...job,
      updatedAt: Date.now()
    });
  }

  function getActiveJob() {
    return GM_getValue(KEYS.ACTIVE_JOB, null);
  }

  function clearActiveJob(nonce = null) {
    const current = getActiveJob();
    if (!current) {
      return;
    }

    if (nonce && current.nonce !== nonce) {
      return;
    }

    GM_setValue(KEYS.ACTIVE_JOB, null);
  }

  function markHeartbeat() {
    const ts = Date.now();
    GM_setValue(ownHeartbeatKey(), ts);
    publishHeartbeat({
      source: isApp() ? 'vixenlabs-app' : 'venice-heartbeat',
      ts
    });
  }

  function isOtherSideFresh() {
    const ts = Number(GM_getValue(otherHeartbeatKey(), 0) || 0);
    return ts && Date.now() - ts <= CONFIG.connectionFreshMs;
  }

  function emitBridgeReadyIfFresh() {
    if (isOtherSideFresh()) {
      publishReady({ source: isVenice() ? 'venice' : 'userscript' });
    }
  }

  function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read Venice image blob.'));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchImageDataUrl(imageUrl) {
    const response = await fetch(imageUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Image fetch failed with ${response.status}`);
    }
    return readBlobAsDataUrl(await response.blob());
  }

  function setTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(textarea, value);
    } else {
      textarea.value = value;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function waitForEnabledSubmit() {
    const start = Date.now();
    while (Date.now() - start < CONFIG.submitWaitMs) {
      const button = queryFirst(SELECTORS.veniceSubmit);
      if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        return button;
      }
      await sleep(150);
    }
    return null;
  }

  function getLatestVeniceImageSrc() {
    const images = Array.from(document.querySelectorAll(SELECTORS.veniceImage.join(', ')));
    const last = images[images.length - 1];
    return last?.currentSrc || last?.src || '';
  }

  async function waitForNewVeniceImage(previousSrc) {
    const start = Date.now();
    while (Date.now() - start < CONFIG.imageWaitMs) {
      const images = Array.from(document.querySelectorAll(SELECTORS.veniceImage.join(', ')));
      const last = images[images.length - 1];
      const imageUrl = last?.currentSrc || last?.src || '';

      if (last && imageUrl && imageUrl !== previousSrc && last.complete) {
        return last;
      }

      await sleep(500);
    }

    return null;
  }

  async function imageElementToDataUrl(image) {
    const imageUrl = image?.currentSrc || image?.src || '';
    if (!imageUrl) {
      throw new Error('image src missing');
    }

    return fetchImageDataUrl(imageUrl);
  }

  async function waitForImageResult(job) {
    const start = Date.now();
    const previousSrc = job?.previousSrc || '';

    while (Date.now() - start < CONFIG.imageWaitMs) {
      const latestImage = await waitForNewVeniceImage(previousSrc);

      if (latestImage) {
        const dataUrl = await imageElementToDataUrl(latestImage);
        publishImage({
          nonce: job.nonce,
          ts: Date.now(),
          detail: 'Image transferred',
          dataUrl,
          prompt: job.prompt,
          negativePrompt: job.negativePrompt || '',
          settings: job.settings || null,
          meta: job.meta || null,
          model: job.settings?.model || null,
          width: latestImage.naturalWidth || null,
          height: latestImage.naturalHeight || null,
          mime: 'image/png'
        });
        GM_setValue(KEYS.LAST_PROCESSED_NONCE, job.nonce);
        clearActiveJob(job.nonce);
        return;
      }

      break;
    }

    publishStatus({
      nonce: job.nonce,
      status: 'image transfer failed',
      detail: 'Timed out waiting for a Venice image result.'
    });
  }

  function replayPendingRequest() {
    const request = GM_getValue(KEYS.REQUEST, null);
    const nonce = GM_getValue(KEYS.REQUEST_NONCE, null);
    const lastProcessed = GM_getValue(KEYS.LAST_PROCESSED_NONCE, null);

    if (!request?.nonce || !nonce || nonce === lastProcessed) {
      return;
    }

    window.setTimeout(() => {
      setActiveJob({
        ...(getActiveJob() || {}),
        ...request,
        nonce: request.nonce,
        prompt: request.prompt,
        previousSrc: getActiveJob()?.previousSrc || '',
        status: 'resuming-image-transfer'
      });
      handleVeniceJob(request);
    }, CONFIG.replayWaitMs);
  }

  function syncAppSideFromStorage() {
    GM_addValueChangeListener(KEYS.STATUS, (_key, _oldValue, value) => {
      if (value) {
        dispatchPageEvent(BRIDGE_EVENTS.status, value);
      }
    });

    GM_addValueChangeListener(KEYS.ERROR, (_key, _oldValue, value) => {
      if (value) {
        dispatchPageEvent(BRIDGE_EVENTS.error, value);
      }
    });

    GM_addValueChangeListener(KEYS.RESULT_NONCE, (_key, oldValue, value) => {
      if (!value || value === oldValue) {
        return;
      }

      const stored = GM_getValue(KEYS.RESULT, null);
      const payload = stored && typeof stored === 'object'
        ? stored
        : stored
          ? {
            nonce: value,
            ts: Date.now(),
            detail: 'Image transferred',
            dataUrl: stored
          }
          : null;

      if (payload) {
        dispatchPageEvent(BRIDGE_EVENTS.image, payload);
      }
    });
  }

  async function handleVeniceJob(job) {
    if (!job?.nonce || !job?.prompt) {
      publishError({
        nonce: job?.nonce || null,
        message: 'Venice bridge received an invalid request payload.'
      });
      return;
    }

    if (document.hidden) {
      publishStatus({
        nonce: job.nonce,
        status: 'waiting for visible Venice tab',
        detail: 'Bring the Venice tab to the foreground before retrying.'
      });
      return;
    }

    const textarea = await waitForElement(SELECTORS.veniceTextarea, CONFIG.textareaWaitMs);
    if (!textarea) {
      publishStatus({
        nonce: job.nonce,
        status: 'error: textarea not found',
        detail: 'Could not find the Venice prompt textarea.'
      });
      return;
    }

    publishStatus({ nonce: job.nonce, status: 'filling venice', detail: 'Writing prompt into Venice.' });
    setTextareaValue(textarea, job.prompt);
    textarea.focus();
    await sleep(CONFIG.clickDelayMs);

    const submit = await waitForEnabledSubmit();
    if (!submit) {
      publishStatus({
        nonce: job.nonce,
        status: 'timeout: submit not enabled',
        detail: 'Venice submit button did not become available in time.'
      });
      return;
    }

    const previousSrc = getLatestVeniceImageSrc();
    publishStatus({ nonce: job.nonce, status: 'submitting', detail: 'Submitting to Venice.' });
    submit.click();
    publishStatus({ nonce: job.nonce, status: 'submitted', detail: 'Venice request submitted.' });

    setActiveJob({
      ...job,
      previousSrc,
      status: 'submitted'
    });

    try {
      await waitForImageResult({
        ...job,
        previousSrc
      });
    } catch (error) {
      publishError({
        nonce: job.nonce,
        message: error?.message || 'Venice image transfer failed.'
      });
    }
  }

  function bootAppSide() {
    syncAppSideFromStorage();

    window.addEventListener(BRIDGE_EVENTS.generate, (event) => {
      const request = event.detail || {};
      if (!request.nonce) {
        return;
      }

      GM_setValue(KEYS.REQUEST, request);
      GM_setValue(KEYS.REQUEST_NONCE, request.nonce);
      setActiveJob({
        nonce: request.nonce,
        prompt: request.prompt,
        settings: request.settings,
        negativePrompt: request.negativePrompt || '',
        createdAt: Date.now()
      });
      publishStatus({
        nonce: request.nonce,
        status: 'submitted',
        detail: 'Request sent to the Venice bridge.'
      });
    });

    emitBridgeReadyIfFresh();
    setInterval(markHeartbeat, CONFIG.heartbeatMs);
    markHeartbeat();
  }

  function bootVeniceSide() {
    GM_addValueChangeListener(KEYS.REQUEST_NONCE, async () => {
      const request = GM_getValue(KEYS.REQUEST, null);
      if (!request?.nonce) {
        return;
      }

      const lastProcessed = GM_getValue(KEYS.LAST_PROCESSED_NONCE, null);
      if (lastProcessed === request.nonce) {
        return;
      }

      emitBridgeReadyIfFresh();
      await handleVeniceJob(request);
    });

    GM_addValueChangeListener(KEYS.HEARTBEAT_APP, () => {
      emitBridgeReadyIfFresh();
      replayPendingRequest();
    });

    document.addEventListener('visibilitychange', () => {
      const job = getActiveJob();
      if (!job) {
        return;
      }

      if (document.hidden) {
        publishStatus({
          nonce: job.nonce,
          status: 'waiting for visible Venice tab',
          detail: 'Bring Venice back to the foreground before retrying.'
        });
      }
    });

    emitBridgeReadyIfFresh();
    replayPendingRequest();
    setInterval(markHeartbeat, CONFIG.heartbeatMs);
    markHeartbeat();
  }

  if (isApp()) {
    bootAppSide();
  }

  if (isVenice()) {
    bootVeniceSide();
  }
})();
