const FALLBACK_RUNTIME_VERSION = 'dev';
export const RUNTIME_UPDATE_MESSAGE = 'A new release is ready. Refresh to load the latest schema, models, and presets.';

export function getRuntimeVersion() {
  if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
    return __APP_VERSION__;
  }

  return FALLBACK_RUNTIME_VERSION;
}

export function createVersionedRuntimeUrl(path, runtimeVersion = getRuntimeVersion()) {
  const normalizedPath = path.replace(/^\//, '');
  const [pathname, queryString] = `${import.meta.env.BASE_URL}${normalizedPath}`.split('?');
  const params = new URLSearchParams(queryString || '');
  params.set('v', runtimeVersion);
  return `${pathname}?${params.toString()}`;
}

export function createRuntimeUpdateState(applyRuntimeUpdate) {
  return {
    runtimeUpdateAvailable: true,
    runtimeUpdateMessage: RUNTIME_UPDATE_MESSAGE,
    applyRuntimeUpdate: applyRuntimeUpdate || null
  };
}
