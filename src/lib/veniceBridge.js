const BRIDGE_EVENT_HANDLERS = {
  'xgen:bridge-ready': 'onReady',
  'xgen:status-update': 'onStatus',
  'xgen:generation-error': 'onError',
  'xgen:image-received': 'onImage',
  'xgen:bridge-heartbeat': 'onHeartbeat'
};

const HEARTBEAT_STALE_MS = 4500;

const QUEUED_STATUSES = ['submitted', 'prompt captured', 'standby'];
const RUNNING_STATUSES = [
  'waiting for image',
  'extracting image',
  'resuming image transfer',
  'received from x.gen',
  'filling venice',
  'waiting for submit enable',
  'submitting'
];
const RETRYABLE_STATUSES = [
  'selector check failed',
  'timeout: submit not enabled',
  'error: textarea not found',
  'image transfer failed'
];
const FAILED_STATUSES = [
  'error: x.gen handler failed',
  'error: venice handler failed',
  'error: prompt empty',
  'error: received empty prompt'
];

export function dispatchGenerationRequest(request) {
  window.dispatchEvent(new CustomEvent('xgen:generate', { detail: request }));
}

export function subscribeToVeniceBridge(handlers = {}) {
  const listeners = Object.entries(BRIDGE_EVENT_HANDLERS).map(([eventName, handlerName]) => {
    const listener = (event) => {
      const handler = handlers[handlerName];

      if (typeof handler === 'function') {
        handler(event.detail);
      }
    };

    window.addEventListener(eventName, listener);
    return [eventName, listener];
  });

  return () => {
    listeners.forEach(([eventName, listener]) => {
      window.removeEventListener(eventName, listener);
    });
  };
}

export function normalizeBridgeStatus(statusPayload) {
  const payload = statusPayload || {};
  const rawStatus = String(payload.status || '').trim();
  const normalizedStatus = rawStatus.toLowerCase();
  const normalized = {
    ...payload,
    nonce: payload.nonce ?? null,
    detail: payload.detail ?? payload.message ?? '',
    rawStatus,
    status: 'running',
    terminal: false,
    canRetry: false,
    connected: payload.connected ?? true,
    bridgeState: payload.bridgeState ?? null
  };

  if (payload.type === 'ready') {
    return {
      ...normalized,
      status: 'running',
      connected: true,
      bridgeState: 'ready'
    };
  }

  if (payload.type === 'heartbeat') {
    const ageMs = Date.now() - Number(payload.ts || 0);

    if (!payload.ts || ageMs > HEARTBEAT_STALE_MS) {
      return {
        ...normalized,
        status: 'bridge_unavailable',
        terminal: true,
        canRetry: true,
        connected: false,
        bridgeState: 'stale'
      };
    }

    return {
      ...normalized,
      status: 'running',
      connected: true,
      bridgeState: 'ready'
    };
  }

  if (payload.type === 'image' || normalizedStatus === 'image transferred') {
    return {
      ...normalized,
      status: 'succeeded',
      terminal: true,
      connected: payload.connected ?? true
    };
  }

  if (payload.type === 'error') {
    return {
      ...normalized,
      status: 'failed',
      terminal: true,
      detail: payload.message ?? normalized.detail
    };
  }

  if (payload.connected === false) {
    return {
      ...normalized,
      status: 'bridge_unavailable',
      terminal: true,
      canRetry: true,
      connected: false,
      bridgeState: 'unavailable'
    };
  }

  if (normalizedStatus === 'waiting for visible venice tab') {
    return {
      ...normalized,
      status: 'waiting_visibility',
      canRetry: true
    };
  }

  if (QUEUED_STATUSES.includes(normalizedStatus)) {
    return {
      ...normalized,
      status: 'queued'
    };
  }

  if (RUNNING_STATUSES.includes(normalizedStatus)) {
    return {
      ...normalized,
      status: 'running'
    };
  }

  if (RETRYABLE_STATUSES.includes(normalizedStatus)) {
    return {
      ...normalized,
      status: 'retryable',
      terminal: true,
      canRetry: true
    };
  }

  if (FAILED_STATUSES.includes(normalizedStatus)) {
    return {
      ...normalized,
      status: 'failed',
      terminal: true
    };
  }

  return normalized;
}
