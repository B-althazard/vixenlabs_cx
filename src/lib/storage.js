const USER_PRESETS_KEY = 'vixenlabs.user-presets';
const SETTINGS_KEY = 'vixenlabs.settings';

export const STORAGE_VERSION = '1.0.0';

function isVersionedPayload(value) {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof value.storageVersion === 'string'
    && 'value' in value;
}

export function createStorageMetadata(schemaVersion) {
  return {
    storageVersion: STORAGE_VERSION,
    schemaVersion: typeof schemaVersion === 'string' ? schemaVersion : ''
  };
}

export function createVersionedPayload(value, schemaVersion) {
  return {
    ...createStorageMetadata(schemaVersion),
    value
  };
}

export function readVersionedPayload(rawValue, fallbackValue) {
  if (isVersionedPayload(rawValue)) {
    return rawValue;
  }

  return createVersionedPayload(rawValue ?? fallbackValue, '');
}

export function loadSettingsRecord() {
  return readVersionedPayload(loadJsonValue(SETTINGS_KEY, {}), {});
}

export function saveSettingsRecord(settings, schemaVersion) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(createVersionedPayload(settings, schemaVersion))
  );
}

export function loadUserPresetsRecord() {
  return readVersionedPayload(loadJsonValue(USER_PRESETS_KEY, []), []);
}

export function saveUserPresetsRecord(presets, schemaVersion) {
  localStorage.setItem(
    USER_PRESETS_KEY,
    JSON.stringify(createVersionedPayload(presets, schemaVersion))
  );
}

export function loadUserPresets() {
  return loadUserPresetsRecord().value;
}

export function saveUserPresets(presets) {
  saveUserPresetsRecord(presets);
}

export function loadSettings() {
  return loadSettingsRecord().value;
}

export function saveSettings(settings) {
  saveSettingsRecord(settings);
}

export function createSettingsPatch(currentSettings, patch) {
  return {
    ...currentSettings,
    ...patch
  };
}

function loadJsonValue(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}
