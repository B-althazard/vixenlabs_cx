const USERSCRIPT_FILENAME = 'vixenlabs-venice-bridge.user.js';

export function getUserscriptUrl() {
  const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';

  return `${baseUrl}${USERSCRIPT_FILENAME}`;
}

export function downloadBridgeUserscript() {
  if (typeof window === 'undefined') {
    return false;
  }

  const link = document.createElement('a');
  link.href = getUserscriptUrl();
  link.download = USERSCRIPT_FILENAME;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

export function openBridgeUserscript() {
  if (typeof window === 'undefined') {
    return false;
  }

  window.open(getUserscriptUrl(), '_blank', 'noopener');
  return true;
}
