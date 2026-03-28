const USERSCRIPT_FILENAME = 'vixenlabs-venice-bridge.user.js';

export function getUserscriptUrl() {
  const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';
  const buildId = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_BUILD_ID
    ? import.meta.env.VITE_APP_BUILD_ID
    : Date.now();

  return `${baseUrl}${USERSCRIPT_FILENAME}?v=${buildId}`;
}

export function downloadBridgeUserscript() {
  if (typeof window === 'undefined') {
    return false;
  }

  window.open(getUserscriptUrl(), '_blank', 'noopener');
  return true;
}
