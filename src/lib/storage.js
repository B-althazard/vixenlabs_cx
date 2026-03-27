const USER_PRESETS_KEY = 'vixenlabs.user-presets';
const SETTINGS_KEY = 'vixenlabs.settings';

export function loadUserPresets() {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserPresets(presets) {
  localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function createSettingsPatch(currentSettings, patch) {
  return {
    ...currentSettings,
    ...patch
  };
}
