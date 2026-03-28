import Dexie from 'dexie';
import { create } from 'zustand';
import { buildPromptPackage, randomizeForm, resolveState } from '../lib/engines';
import { createRuntimeUpdateState, RUNTIME_UPDATE_MESSAGE } from '../lib/runtimeFreshness';
import { buildFieldIndex, createDefaultFormValues, createDefaultLocks, loadModels, loadSchemaBundle, loadSystemPresets } from '../lib/schema';
import {
  createSettingsPatch,
  loadSettings,
  loadSettingsRecord,
  loadUserPresets,
  loadUserPresetsRecord,
  saveSettings,
  saveSettingsRecord,
  saveUserPresets,
  saveUserPresetsRecord
} from '../lib/storage';
import {
  sanitizeGalleryEntries,
  sanitizeImportedPresets,
  sanitizePresetCollection,
  sanitizeSettings
} from '../lib/runtimeState';

const galleryDb = new Dexie('vixenlabs-gallery');
galleryDb.version(1).stores({ images: '++id, createdAt' });

export const useAppStore = create((set, get) => ({
  schemaBundle: null,
  fieldIndex: {},
  models: {},
  selectedModelId: 'chroma1-hd',
  formValues: {},
  locks: {},
  disabled: {},
  visibleCategories: {},
  promptPackage: null,
  notices: [],
  isValid: true,
  missingRequired: [],
  presets: [],
  systemPresets: [],
  userPresets: [],
  gallery: [],
  activeCategoryId: 'identity',
  runtimeUpdateAvailable: false,
  runtimeUpdateMessage: '',
  applyRuntimeUpdate: null,
  copyStatus: '',
  actionStatus: '',
  loading: true,
  error: '',
  async initialize() {
    try {
      const [schemaBundle, models] = await Promise.all([loadSchemaBundle(), loadModels()]);
      const systemPresets = await loadSystemPresets(schemaBundle, models);
      const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();
      const initializedState = createInitializedState({
        schemaBundle,
        models,
        systemPresets,
        settingsRecord: loadSettingsRecord(),
        userPresetRecord: loadUserPresetsRecord(),
        galleryEntries: gallery
      });

      saveSanitizedSettings(schemaBundle, initializedState.persistedSettings);
      saveUserPresetsRecord(initializedState.userPresets, schemaBundle.version);
      await replaceGalleryEntries(initializedState.gallery);

      set({
        ...initializedState,
        runtimeUpdateAvailable: false,
        runtimeUpdateMessage: '',
        applyRuntimeUpdate: null
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  updateField(fieldId, value) {
    const state = get();
    const nextValues = { ...state.formValues, [fieldId]: value };
    const resolved = resolveState(state.schemaBundle, nextValues);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      state.selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    );

    set({
      formValues: resolved.values,
      disabled: resolved.evaluation.disabled,
      visibleCategories: resolved.evaluation.visibleCategories,
      promptPackage,
      notices: resolved.evaluation.notices,
      isValid: resolved.evaluation.isValid,
      missingRequired: resolved.evaluation.missingRequired
    });
    persistWorkingState(get());
  },
  toggleLock(fieldId) {
    set((state) => {
      const locks = { ...state.locks, [fieldId]: !state.locks[fieldId] };
      saveSettings(createSettingsPatch(loadSettings(), {
        selectedModelId: state.selectedModelId,
        locks,
        formValues: state.formValues,
        activeCategoryId: state.activeCategoryId
      }));
      return { locks };
    });
  },
  setActiveCategoryId(categoryId) {
    set({ activeCategoryId: categoryId });
    persistWorkingState({ ...get(), activeCategoryId: categoryId });
  },
  setRuntimeUpdateReady(applyRuntimeUpdate) {
    set({
      ...createRuntimeUpdateState(applyRuntimeUpdate),
      actionStatus: RUNTIME_UPDATE_MESSAGE
    });
  },
  async refreshRuntime() {
    const { applyRuntimeUpdate } = get();

    set({ actionStatus: 'Refreshing app…' });

    if (applyRuntimeUpdate) {
      await applyRuntimeUpdate(true);
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
  setModel(selectedModelId) {
    const state = get();
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      selectedModelId,
      state.formValues,
      state.visibleCategories
    );
    saveSettings(createSettingsPatch(loadSettings(), {
      selectedModelId,
      locks: state.locks,
      formValues: state.formValues,
      activeCategoryId: state.activeCategoryId
    }));
    set({ selectedModelId, promptPackage });
    persistWorkingState({ ...get(), selectedModelId, promptPackage });
  },
  randomize() {
    const state = get();
    const result = randomizeForm(state.schemaBundle, state.fieldIndex, state.formValues, state.locks, state.disabled);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      state.selectedModelId,
      result.values,
      result.evaluation.visibleCategories
    );
    set({
      formValues: result.values,
      disabled: result.evaluation.disabled,
      visibleCategories: result.evaluation.visibleCategories,
      promptPackage,
      notices: result.evaluation.notices,
      isValid: result.evaluation.isValid,
      missingRequired: result.evaluation.missingRequired
    });
    persistWorkingState(get());
  },
  async captureGeneration() {
    const state = get();
    const entry = {
      createdAt: new Date().toISOString(),
      imageUrl: null,
      isPlaceholder: true,
      title: `Placeholder render ${state.gallery.length + 1}`,
      selectedModelId: state.selectedModelId,
      formValues: state.formValues,
      promptPackage: state.promptPackage
    };

    const id = await galleryDb.images.add(entry);
    const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();
    set({ gallery: gallery.map((item) => ({ ...item, id: item.id || id })), actionStatus: 'Added render to gallery' });
    clearActionStatus(get, set);
  },
  async loadGalleryEntry(entryId) {
    const state = get();
    const entry = state.gallery.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }
    const restored = restorePersistedSelection({
      schemaBundle: state.schemaBundle,
      models: state.models,
      selectedModelId: state.selectedModelId,
      activeCategoryId: state.activeCategoryId,
      locks: state.locks,
      entryLabel: 'gallery entry',
      payload: entry
    });
    saveSanitizedSettings(state.schemaBundle, restored.persistedSettings);
    set(restored);
    clearActionStatus(get, set);
  },
  async deleteGalleryEntry(entryId) {
    await galleryDb.images.delete(entryId);
    const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();
    set({ gallery, actionStatus: 'Deleted gallery entry' });
    clearActionStatus(get, set);
  },
  savePreset() {
    const state = get();
    const customCount = state.userPresets.length + 1;
    const preset = {
      id: crypto.randomUUID(),
      type: 'user',
      name: `Custom ${customCount}`,
      createdAt: new Date().toISOString(),
      thumbnailLabel: state.formValues.lingerieType || 'look',
      description: 'Saved from the current working state.',
      selectedModelId: state.selectedModelId,
      formValues: state.formValues
    };

    const userPresets = [preset, ...state.userPresets];
    saveUserPresetsRecord(userPresets, state.schemaBundle?.version);
    set({
      userPresets,
      presets: [...state.systemPresets, ...userPresets],
      actionStatus: 'Saved custom preset'
    });
    clearActionStatus(get, set);
  },
  deleteUserPreset(presetId) {
    const state = get();
    const userPresets = state.userPresets.filter((preset) => preset.id !== presetId);
    saveUserPresetsRecord(userPresets, state.schemaBundle?.version);
    set({
      userPresets,
      presets: [...state.systemPresets, ...userPresets],
      actionStatus: 'Deleted custom preset'
    });
    clearActionStatus(get, set);
  },
  loadPreset(presetId) {
    const state = get();
    const preset = state.presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    const restored = restorePersistedSelection({
      schemaBundle: state.schemaBundle,
      models: state.models,
      selectedModelId: state.selectedModelId,
      activeCategoryId: state.activeCategoryId,
      locks: state.locks,
      entryLabel: `preset ${preset.name}`,
      payload: preset
    });
    saveSanitizedSettings(state.schemaBundle, restored.persistedSettings);
    set(restored);
    clearActionStatus(get, set);
  },
  resetCurrentLook() {
    const state = get();
    const defaultValues = createDefaultFormValues(state.schemaBundle);
    const resolved = resolveState(state.schemaBundle, defaultValues);
    const activeCategoryId = selectActiveCategoryId(state.schemaBundle, resolved.evaluation.visibleCategories, 'identity');
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      state.selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    );
    set({
      formValues: resolved.values,
      disabled: resolved.evaluation.disabled,
      visibleCategories: resolved.evaluation.visibleCategories,
      activeCategoryId,
      promptPackage,
      notices: resolved.evaluation.notices,
      isValid: resolved.evaluation.isValid,
      missingRequired: resolved.evaluation.missingRequired,
      actionStatus: 'Reset current look'
    });
    persistWorkingState(get());
    clearActionStatus(get, set);
  },
  async copyPrompt() {
    const state = get();
    try {
      await navigator.clipboard.writeText(state.promptPackage?.prompt || '');
      set({ copyStatus: 'Copied prompt' });
    } catch {
      set({ copyStatus: 'Clipboard unavailable' });
    }
    setTimeout(() => {
      const currentState = get();
      if (currentState.copyStatus) {
        set({ copyStatus: '' });
      }
    }, 1800);
  },
  exportCurrentLook() {
    const state = get();
    const payload = {
      exportedAt: new Date().toISOString(),
      selectedModelId: state.selectedModelId,
      formValues: state.formValues,
      promptPackage: state.promptPackage,
      notices: state.notices
    };
    downloadJson('vixenlabs-current-look.json', payload);
    set({ actionStatus: 'Exported current look' });
    clearActionStatus(get, set);
  },
  exportUserPresets() {
    const state = get();
    downloadJson('vixenlabs-user-presets.json', state.userPresets);
    set({ actionStatus: 'Exported custom presets' });
    clearActionStatus(get, set);
  },
  importUserPresets(importedPresets) {
    const state = get();
    const merged = mergeImportedPresets({
      schemaBundle: state.schemaBundle,
      models: state.models,
      systemPresets: state.systemPresets,
      userPresets: state.userPresets,
      selectedModelId: state.selectedModelId,
      importedPresets
    });

    saveUserPresetsRecord(merged.userPresets, state.schemaBundle?.version);
    set(merged);
    clearActionStatus(get, set);
  }
}));

export function createInitializedState({
  schemaBundle,
  models,
  systemPresets,
  settingsRecord,
  userPresetRecord,
  galleryEntries
}) {
  const sanitizedSettings = sanitizeSettings(
    schemaBundle,
    models,
    settingsRecord?.value,
    settingsRecord
  );
  const sanitizedPresets = sanitizePresetCollection(
    schemaBundle,
    models,
    userPresetRecord?.value
  );
  const sanitizedGallery = sanitizeGalleryEntries(schemaBundle, models, galleryEntries);
  const resolved = resolveState(schemaBundle, sanitizedSettings.value.formValues);
  const activeCategoryId = selectActiveCategoryId(
    schemaBundle,
    resolved.evaluation.visibleCategories,
    sanitizedSettings.value.activeCategoryId
  );
  const selectedModelId = sanitizedSettings.value.selectedModelId;
  const locks = {
    ...createDefaultLocks(schemaBundle),
    ...(sanitizedSettings.value.locks || {})
  };
  const recoveryNotices = [
    ...sanitizedSettings.notices,
    ...sanitizedPresets.notices,
    ...sanitizedGallery.notices
  ];

  return {
    schemaBundle,
    fieldIndex: buildFieldIndex(schemaBundle),
    models,
    selectedModelId,
    formValues: resolved.values,
    locks,
    disabled: resolved.evaluation.disabled,
    visibleCategories: resolved.evaluation.visibleCategories,
    promptPackage: buildPromptPackage(
      schemaBundle,
      models,
      selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    ),
    notices: resolved.evaluation.notices,
    isValid: resolved.evaluation.isValid,
    missingRequired: resolved.evaluation.missingRequired,
    systemPresets,
    userPresets: sanitizedPresets.value,
    presets: [...systemPresets, ...sanitizedPresets.value],
    gallery: sanitizedGallery.value,
    activeCategoryId,
    copyStatus: '',
    actionStatus: buildRecoveryStatus(
      'Recovered your session',
      recoveryNotices,
      sanitizedSettings.quarantined
        + sanitizedPresets.quarantined
        + sanitizedGallery.quarantined
    ),
    loading: false,
    error: '',
    persistedSettings: {
      selectedModelId,
      locks,
      formValues: resolved.values,
      activeCategoryId
    }
  };
}

export function restorePersistedSelection({
  schemaBundle,
  models,
  selectedModelId,
  activeCategoryId,
  locks,
  entryLabel,
  payload
}) {
  const sanitizedSelection = sanitizeSettings(schemaBundle, models, {
    selectedModelId: payload?.selectedModelId || selectedModelId,
    formValues: payload?.formValues,
    locks,
    activeCategoryId
  });
  const resolved = resolveState(schemaBundle, sanitizedSelection.value.formValues);
  const nextActiveCategoryId = selectActiveCategoryId(
    schemaBundle,
    resolved.evaluation.visibleCategories,
    sanitizedSelection.value.activeCategoryId
  );

  return {
    selectedModelId: sanitizedSelection.value.selectedModelId,
    formValues: resolved.values,
    disabled: resolved.evaluation.disabled,
    visibleCategories: resolved.evaluation.visibleCategories,
    activeCategoryId: nextActiveCategoryId,
    promptPackage: buildPromptPackage(
      schemaBundle,
      models,
      sanitizedSelection.value.selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    ),
    notices: resolved.evaluation.notices,
    isValid: resolved.evaluation.isValid,
    missingRequired: resolved.evaluation.missingRequired,
    actionStatus: buildRecoveryStatus(
      `Recovered ${entryLabel}`,
      sanitizedSelection.notices,
      sanitizedSelection.quarantined
    ),
    persistedSettings: {
      selectedModelId: sanitizedSelection.value.selectedModelId,
      locks,
      formValues: resolved.values,
      activeCategoryId: nextActiveCategoryId
    }
  };
}

export function mergeImportedPresets({
  schemaBundle,
  models,
  systemPresets,
  userPresets,
  selectedModelId,
  importedPresets
}) {
  const sanitizedImport = sanitizeImportedPresets(schemaBundle, models, importedPresets);
  const preparedImports = sanitizedImport.value.map((preset, index) => ({
    ...preset,
    id: crypto.randomUUID(),
    type: 'user',
    name: preset.name || `Imported ${Date.now() + index}`,
    selectedModelId: preset.selectedModelId || selectedModelId
  }));
  const nextUserPresets = [...preparedImports, ...userPresets];

  return {
    userPresets: nextUserPresets,
    presets: [...systemPresets, ...nextUserPresets],
    actionStatus: buildRecoveryStatus(
      preparedImports.length
        ? `Recovered and imported ${preparedImports.length} preset${preparedImports.length === 1 ? '' : 's'}`
        : 'Recovered preset import',
      sanitizedImport.notices,
      sanitizedImport.quarantined,
      preparedImports.length ? null : 'No importable presets were added'
    )
  };
}

function persistWorkingState(state) {
  if (!state?.schemaBundle) {
    return;
  }

  saveSanitizedSettings(state.schemaBundle, createSettingsPatch(loadSettings(), {
    selectedModelId: state.selectedModelId,
    locks: state.locks,
    formValues: state.formValues,
    activeCategoryId: state.activeCategoryId
  }));
}

function selectActiveCategoryId(schemaBundle, visibleCategories, desiredCategoryId) {
  if (desiredCategoryId && visibleCategories[desiredCategoryId]) {
    return desiredCategoryId;
  }

  const firstVisible = schemaBundle.categories.find((category) => visibleCategories[category.id]);
  return firstVisible?.id || 'identity';
}

function clearActionStatus(get, set) {
  setTimeout(() => {
    if (get().actionStatus) {
      set({ actionStatus: '' });
    }
  }, 1800);
}

function buildRecoveryStatus(baseMessage, notices, quarantined, fallbackMessage = null) {
  if (!notices.length && !quarantined) {
    return fallbackMessage || baseMessage.replace(/^Recovered /, '');
  }

  const details = [];

  if (notices.length) {
    details.push(`${notices.length} recovery adjustment${notices.length === 1 ? '' : 's'}`);
  }

  if (quarantined) {
    details.push(`quarantined ${quarantined} invalid item${quarantined === 1 ? '' : 's'}`);
  }

  if (fallbackMessage) {
    details.push(fallbackMessage);
  }

  return `${baseMessage}: ${details.join('. ')}.`;
}

function saveSanitizedSettings(schemaBundle, settings) {
  saveSettingsRecord(settings, schemaBundle?.version);
}

async function replaceGalleryEntries(entries) {
  await galleryDb.transaction('rw', galleryDb.images, async () => {
    await galleryDb.images.clear();

    if (entries.length) {
      await galleryDb.images.bulkPut(entries);
    }
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
