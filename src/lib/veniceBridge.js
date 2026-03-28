const BRIDGE_EVENT_HANDLERS = {
  'xgen:bridge-ready': 'onReady',
  'xgen:status-update': 'onStatus',
  'xgen:generation-error': 'onError',
  'xgen:image-received': 'onImage',
  'xgen:bridge-heartbeat': 'onHeartbeat'
};

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
  return statusPayload;
}
