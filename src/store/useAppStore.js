import Dexie from 'dexie';
import { create } from 'zustand';
import { buildPromptPackage, randomizeForm, resolveState } from '../lib/engines';
import { buildFieldIndex, createDefaultFormValues, createDefaultLocks, loadModels, loadSchemaBundle, loadSystemPresets } from '../lib/schema';
import { createSettingsPatch, loadSettings, loadUserPresets, saveSettings, saveUserPresets } from '../lib/storage';

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
  copyStatus: '',
  actionStatus: '',
  loading: true,
  error: '',
  async initialize() {
    try {
      const [schemaBundle, models] = await Promise.all([loadSchemaBundle(), loadModels()]);
      const systemPresets = await loadSystemPresets(schemaBundle, models);
      const settings = loadSettings();
      const userPresets = loadUserPresets();
      const defaultValues = createDefaultFormValues(schemaBundle);
      const sourceValues = settings.formValues || defaultValues;
      const resolved = resolveState(schemaBundle, sourceValues);
      const selectedModelId = settings.selectedModelId || 'chroma1-hd';
      const promptPackage = buildPromptPackage(schemaBundle, models, selectedModelId, resolved.values, resolved.evaluation.visibleCategories);
      const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();
      const activeCategoryId = selectActiveCategoryId(schemaBundle, resolved.evaluation.visibleCategories, settings.activeCategoryId);

      set({
        schemaBundle,
        fieldIndex: buildFieldIndex(schemaBundle),
        models,
        selectedModelId,
        formValues: resolved.values,
        locks: { ...createDefaultLocks(schemaBundle), ...(settings.locks || {}) },
        disabled: resolved.evaluation.disabled,
        visibleCategories: resolved.evaluation.visibleCategories,
        promptPackage,
        notices: resolved.evaluation.notices,
        isValid: resolved.evaluation.isValid,
        missingRequired: resolved.evaluation.missingRequired,
        systemPresets,
        userPresets,
        presets: [...systemPresets, ...userPresets],
        gallery,
        activeCategoryId,
        copyStatus: '',
        actionStatus: '',
        loading: false,
        error: ''
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
    const resolved = resolveState(state.schemaBundle, entry.formValues);
    const selectedModelId = entry.selectedModelId || state.selectedModelId;
    const activeCategoryId = selectActiveCategoryId(state.schemaBundle, resolved.evaluation.visibleCategories, state.activeCategoryId);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    );
    saveSettings(createSettingsPatch(loadSettings(), {
      selectedModelId,
      locks: state.locks,
      formValues: resolved.values,
      activeCategoryId
    }));
    set({
      selectedModelId,
      formValues: resolved.values,
      disabled: resolved.evaluation.disabled,
      visibleCategories: resolved.evaluation.visibleCategories,
      activeCategoryId,
      promptPackage,
      notices: resolved.evaluation.notices,
      isValid: resolved.evaluation.isValid,
      missingRequired: resolved.evaluation.missingRequired,
      actionStatus: 'Loaded gallery entry'
    });
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
    saveUserPresets(userPresets);
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
    saveUserPresets(userPresets);
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
    const resolved = resolveState(state.schemaBundle, preset.formValues);
    const activeCategoryId = selectActiveCategoryId(state.schemaBundle, resolved.evaluation.visibleCategories, state.activeCategoryId);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      preset.selectedModelId || state.selectedModelId,
      resolved.values,
      resolved.evaluation.visibleCategories
    );
    saveSettings(createSettingsPatch(loadSettings(), {
      selectedModelId: preset.selectedModelId || state.selectedModelId,
      locks: state.locks,
      formValues: resolved.values,
      activeCategoryId
    }));
    set({
      selectedModelId: preset.selectedModelId || state.selectedModelId,
      formValues: resolved.values,
      disabled: resolved.evaluation.disabled,
      visibleCategories: resolved.evaluation.visibleCategories,
      activeCategoryId,
      promptPackage,
      notices: resolved.evaluation.notices,
      isValid: resolved.evaluation.isValid,
      missingRequired: resolved.evaluation.missingRequired,
      actionStatus: `Loaded preset ${preset.name}`
    });
    persistWorkingState(get());
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
    const sanitized = (Array.isArray(importedPresets) ? importedPresets : [])
      .filter((preset) => preset?.formValues && preset.type !== 'system')
      .map((preset) => ({
        ...preset,
        id: crypto.randomUUID(),
        type: 'user',
        name: preset.name || `Imported ${Date.now()}`,
        selectedModelId: preset.selectedModelId || state.selectedModelId
      }));

    const userPresets = [...sanitized, ...state.userPresets];
    saveUserPresets(userPresets);
    set({
      userPresets,
      presets: [...state.systemPresets, ...userPresets],
      actionStatus: sanitized.length ? `Imported ${sanitized.length} custom preset${sanitized.length > 1 ? 's' : ''}` : 'No importable presets found'
    });
    clearActionStatus(get, set);
  }
}));

function persistWorkingState(state) {
  if (!state?.schemaBundle) {
    return;
  }

  saveSettings(createSettingsPatch(loadSettings(), {
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

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
