import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchGenerationRequest,
  normalizeBridgeStatus,
  subscribeToVeniceBridge
} from '../src/lib/veniceBridge.js';

const BRIDGE_EVENT_NAMES = [
  'xgen:bridge-ready',
  'xgen:status-update',
  'xgen:generation-error',
  'xgen:image-received',
  'xgen:bridge-heartbeat'
];

function createWindowMock() {
  const eventTarget = new EventTarget();

  return {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget)
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('venice bridge adapter', () => {
  it('dispatches xgen:generate with the full request payload', () => {
    const windowMock = createWindowMock();
    const request = {
      nonce: 'nonce-1',
      prompt: 'prompt text',
      negativePrompt: 'negative text',
      settings: { model: 'venice-model', steps: 30 },
      meta: { origin: 'vitest' }
    };
    const received = [];

    vi.stubGlobal('window', windowMock);

    window.addEventListener('xgen:generate', (event) => {
      received.push(event.detail);
    });

    dispatchGenerationRequest(request);

    expect(received).toEqual([request]);
  });

  it('subscribes to all five userscript bridge events and cleans up listeners', () => {
    const windowMock = createWindowMock();
    const received = [];

    vi.stubGlobal('window', windowMock);

    const unsubscribe = subscribeToVeniceBridge({
      onReady: (payload) => received.push(['ready', payload]),
      onStatus: (payload) => received.push(['status', payload]),
      onError: (payload) => received.push(['error', payload]),
      onImage: (payload) => received.push(['image', payload]),
      onHeartbeat: (payload) => received.push(['heartbeat', payload])
    });

    expect(typeof unsubscribe).toBe('function');

    BRIDGE_EVENT_NAMES.forEach((name, index) => {
      window.dispatchEvent(new CustomEvent(name, { detail: { index } }));
    });

    expect(received).toEqual([
      ['ready', { index: 0 }],
      ['status', { index: 1 }],
      ['error', { index: 2 }],
      ['image', { index: 3 }],
      ['heartbeat', { index: 4 }]
    ]);

    unsubscribe();
    window.dispatchEvent(new CustomEvent('xgen:status-update', { detail: { index: 99 } }));

    expect(received).toHaveLength(5);
  });

  it('maps submitted and image-wait lifecycle phrases to non-terminal app states', () => {
    expect(normalizeBridgeStatus({ status: 'submitted', nonce: 'nonce-2' })).toMatchObject({
      nonce: 'nonce-2',
      status: 'queued',
      canRetry: false,
      terminal: false
    });

    expect(normalizeBridgeStatus({ status: 'waiting for image', nonce: 'nonce-2' })).toMatchObject({
      nonce: 'nonce-2',
      status: 'running',
      canRetry: false,
      terminal: false
    });

    expect(normalizeBridgeStatus({ status: 'extracting image', nonce: 'nonce-2' })).toMatchObject({
      nonce: 'nonce-2',
      status: 'running',
      canRetry: false,
      terminal: false
    });
  });

  it('maps recovery-needed Venice failures to retryable states', () => {
    expect(normalizeBridgeStatus({ status: 'selector check failed', detail: 'textarea', nonce: 'nonce-3' })).toMatchObject({
      nonce: 'nonce-3',
      status: 'retryable',
      canRetry: true,
      terminal: true,
      detail: 'textarea'
    });

    expect(normalizeBridgeStatus({ status: 'waiting for visible Venice tab', nonce: 'nonce-4' })).toMatchObject({
      nonce: 'nonce-4',
      status: 'waiting_visibility',
      canRetry: true,
      terminal: false
    });

    expect(normalizeBridgeStatus({ status: 'timeout: submit not enabled', nonce: 'nonce-5' })).toMatchObject({
      nonce: 'nonce-5',
      status: 'retryable',
      canRetry: true,
      terminal: true
    });
  });

  it('maps image receipt to succeeded and preserves the originating nonce', () => {
    expect(normalizeBridgeStatus({ status: 'image transferred', nonce: 'nonce-6', detail: 'done' })).toMatchObject({
      nonce: 'nonce-6',
      status: 'succeeded',
      canRetry: false,
      terminal: true,
      detail: 'done'
    });

    expect(normalizeBridgeStatus({ type: 'image', nonce: 'nonce-7', dataUrl: 'data:image/png;base64,abc' })).toMatchObject({
      nonce: 'nonce-7',
      status: 'succeeded',
      canRetry: false,
      terminal: true,
      dataUrl: 'data:image/png;base64,abc'
    });

    expect(normalizeBridgeStatus({ type: 'error', nonce: 'nonce-8', message: 'handler exploded' })).toMatchObject({
      nonce: 'nonce-8',
      status: 'failed',
      canRetry: false,
      terminal: true,
      message: 'handler exploded'
    });
  });
});
