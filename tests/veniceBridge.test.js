import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchGenerationRequest,
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
});
