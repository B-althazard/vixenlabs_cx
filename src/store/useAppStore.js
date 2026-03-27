import Dexie from 'dexie';
import { create } from 'zustand';
import { buildPromptPackage, evaluateState, randomizeForm, sanitizeFormValues } from '../lib/engines';
import { buildFieldIndex, createDefaultFormValues, createDefaultLocks, loadModels, loadSchemaBundle } from '../lib/schema';
import { loadPresets, loadSettings, savePresets, saveSettings } from '../lib/storage';

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
  presets: [],
  gallery: [],
  activeCategoryId: 'identity',
  loading: true,
  error: '',
  async initialize() {
    try {
      const [schemaBundle, models] = await Promise.all([loadSchemaBundle(), loadModels()]);
      const settings = loadSettings();
      const defaultValues = createDefaultFormValues(schemaBundle);
      const evaluation = evaluateState(schemaBundle, defaultValues);
      const sanitizedValues = sanitizeFormValues(schemaBundle, defaultValues, evaluation.disabled);
      const selectedModelId = settings.selectedModelId || 'chroma1-hd';
      const promptPackage = buildPromptPackage(schemaBundle, models, selectedModelId, sanitizedValues, evaluation.visibleCategories);
      const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();

      set({
        schemaBundle,
        fieldIndex: buildFieldIndex(schemaBundle),
        models,
        selectedModelId,
        formValues: sanitizedValues,
        locks: { ...createDefaultLocks(schemaBundle), ...(settings.locks || {}) },
        disabled: evaluation.disabled,
        visibleCategories: evaluation.visibleCategories,
        promptPackage,
        presets: loadPresets(),
        gallery,
        activeCategoryId: 'identity',
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
    const evaluation = evaluateState(state.schemaBundle, nextValues);
    const sanitizedValues = sanitizeFormValues(state.schemaBundle, nextValues, evaluation.disabled);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      state.selectedModelId,
      sanitizedValues,
      evaluation.visibleCategories
    );

    set({
      formValues: sanitizedValues,
      disabled: evaluation.disabled,
      visibleCategories: evaluation.visibleCategories,
      promptPackage
    });
  },
  toggleLock(fieldId) {
    set((state) => {
      const locks = { ...state.locks, [fieldId]: !state.locks[fieldId] };
      saveSettings({ selectedModelId: state.selectedModelId, locks });
      return { locks };
    });
  },
  setActiveCategoryId(categoryId) {
    set({ activeCategoryId: categoryId });
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
    saveSettings({ selectedModelId, locks: state.locks });
    set({ selectedModelId, promptPackage });
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
      promptPackage
    });
  },
  async captureGeneration() {
    const state = get();
    const entry = {
      createdAt: new Date().toISOString(),
      imageUrl: null,
      isPlaceholder: true,
      title: 'Placeholder render',
      formValues: state.formValues,
      promptPackage: state.promptPackage
    };

    const id = await galleryDb.images.add(entry);
    const gallery = await galleryDb.images.orderBy('createdAt').reverse().toArray();
    set({ gallery: gallery.map((item) => ({ ...item, id: item.id || id })) });
  },
  savePreset() {
    const state = get();
    const preset = {
      id: crypto.randomUUID(),
      name: `Preset ${state.presets.length + 1}`,
      createdAt: new Date().toISOString(),
      thumbnailLabel: state.formValues.lingerieType || 'look',
      formValues: state.formValues
    };

    const presets = [preset, ...state.presets].slice(0, 12);
    savePresets(presets);
    set({ presets });
  },
  loadPreset(presetId) {
    const state = get();
    const preset = state.presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    const evaluation = evaluateState(state.schemaBundle, preset.formValues);
    const sanitizedValues = sanitizeFormValues(state.schemaBundle, preset.formValues, evaluation.disabled);
    const promptPackage = buildPromptPackage(
      state.schemaBundle,
      state.models,
      state.selectedModelId,
      sanitizedValues,
      evaluation.visibleCategories
    );
    set({ formValues: sanitizedValues, disabled: evaluation.disabled, visibleCategories: evaluation.visibleCategories, promptPackage });
  }
}));
