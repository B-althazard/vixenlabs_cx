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
import {
  dispatchGenerationRequest,
  normalizeBridgeStatus,
  subscribeToVeniceBridge
} from '../lib/veniceBridge';
import { downloadBridgeUserscript } from '../lib/bridgeUserscript';

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
  generationJobs: [],
  activeCategoryId: 'identity',
  bridgeReady: false,
  bridgeConnected: false,
  bridgeState: 'unavailable',
  bridgeStatusDetail: '',
  bridgeUnsubscribe: null,
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
      get().setupGenerationBridge();
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  setupGenerationBridge() {
    const state = get();

    if (state.bridgeUnsubscribe || typeof window === 'undefined') {
      return state.bridgeUnsubscribe;
    }

    const bridgeUnsubscribe = subscribeToVeniceBridge({
      onReady: (payload) => {
        applyBridgeConnection(set, get, normalizeBridgeStatus({ type: 'ready', ...payload }));
      },
      onHeartbeat: (payload) => {
        applyBridgeConnection(set, get, normalizeBridgeStatus({ type: 'heartbeat', ...payload }));
      },
      onStatus: (payload) => {
        applyNormalizedJobUpdate(set, get, normalizeBridgeStatus(payload));
      },
      onImage: (payload) => {
        handleGenerationImage(set, get, payload);
      },
      onError: (payload) => {
        handleGenerationError(set, get, payload);
      }
    });

    set({ bridgeUnsubscribe });
    return bridgeUnsubscribe;
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
  async submitGeneration(sourceNonce = null) {
    const state = get();
    const sourceJob = sourceNonce
      ? state.generationJobs.find((job) => job.nonce === sourceNonce)
      : null;

    if (!state.bridgeReady || state.bridgeConnected === false || state.bridgeState === 'bridge_unavailable') {
      set({
        bridgeReady: false,
        bridgeConnected: false,
        bridgeState: 'bridge_unavailable',
        bridgeStatusDetail: state.bridgeStatusDetail,
        actionStatus: buildBridgeRecoveryMessage(state.bridgeStatusDetail)
      });
      return null;
    }

    const job = createGenerationJobSnapshot(state, sourceJob);
    const request = {
      nonce: job.nonce,
      prompt: job.generationPayload.prompt,
      settings: job.generationPayload.settings,
      meta: {
        selectedModelId: job.selectedModelId,
        attempt: job.attempt,
        createdAt: job.createdAt
      }
    };

    if (job.generationPayload.negativePrompt) {
      request.negativePrompt = job.generationPayload.negativePrompt;
    }

    set((currentState) => ({
      generationJobs: [
        job,
        ...currentState.generationJobs.map((existingJob) => {
          if (!sourceJob || existingJob.nonce !== sourceJob.nonce) {
            return existingJob;
          }

          return {
            ...existingJob,
            supersededByNonce: job.nonce
          };
        })
      ],
      actionStatus: `Queued Venice job ${job.attempt}`
    }));

    dispatchGenerationRequest(request);
    return job.nonce;
  },
  async retryGeneration(nonce) {
    return get().submitGeneration(nonce);
  },
  async captureGeneration() {
    return get().submitGeneration();
  },
  async loadGalleryEntry(entryId) {
    const state = get();
    const entry = state.generationJobs.find((item) => item.nonce === entryId || item.id === entryId)
      || state.gallery.find((item) => item.id === entryId);
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
    const generationJob = get().generationJobs.find((item) => item.nonce === entryId || item.id === entryId);
    if (generationJob) {
      set((state) => ({
        generationJobs: state.generationJobs.filter((item) => item.nonce !== generationJob.nonce),
        actionStatus: 'Deleted generation snapshot'
      }));
      clearActionStatus(get, set);
      return;
    }

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
  },
  installBridgeUserscript() {
    const opened = downloadBridgeUserscript();

    set({
      actionStatus: opened
        ? 'Opened the Venice bridge userscript update page. Confirm reinstall/update in your userscript extension.'
        : 'Bridge userscript install is only available in the browser.'
    });

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
    generationJobs: [],
    activeCategoryId,
    bridgeReady: false,
    bridgeConnected: false,
    bridgeState: 'unavailable',
    bridgeStatusDetail: '',
    bridgeUnsubscribe: null,
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

function createGenerationJobSnapshot(state, sourceJob = null) {
  const nonce = createGenerationNonce();
  const payload = cloneData(sourceJob?.generationPayload || state.promptPackage?.generationPayload || {});
  const promptPackageSnapshot = cloneData(sourceJob?.promptPackageSnapshot || state.promptPackage);
  const formValuesSnapshot = cloneData(sourceJob?.formValuesSnapshot || state.formValues);

  return {
    nonce,
    id: nonce,
    createdAt: new Date().toISOString(),
    completedAt: null,
    status: 'queued',
    detail: 'Waiting for Venice bridge',
    bridgeState: state.bridgeState,
    canRetry: false,
    attempt: (sourceJob?.attempt || 0) + 1,
    supersededByNonce: null,
    selectedModelId: sourceJob?.selectedModelId || state.selectedModelId,
    generationPayload: payload,
    promptPackageSnapshot,
    promptPackage: promptPackageSnapshot,
    formValuesSnapshot,
    formValues: formValuesSnapshot,
    resultDataUrl: null,
    errorMessage: '',
    title: `Venice render ${state.generationJobs.length + 1}`
  };
}

function applyBridgeConnection(set, get, normalized) {
  const isUnavailable = normalized.status === 'bridge_unavailable';

  set({
    bridgeReady: !isUnavailable,
    bridgeConnected: normalized.connected !== false,
    bridgeState: normalized.bridgeState || normalized.status,
    bridgeStatusDetail: normalized.detail || ''
  });

  if (isUnavailable) {
    set({ actionStatus: buildBridgeRecoveryMessage(normalized.detail) });
  }
}

function applyNormalizedJobUpdate(set, get, normalized) {
  if (!normalized?.nonce) {
    applyBridgeConnection(set, get, normalized);
    return;
  }

  const targetJob = get().generationJobs.find((job) => job.nonce === normalized.nonce);
  if (targetJob?.supersededByNonce) {
    set({ actionStatus: buildStaleResultMessage() });
    return;
  }

  set((state) => ({
    bridgeReady: normalized.connected !== false,
    bridgeConnected: normalized.connected !== false,
    bridgeState: normalized.bridgeState || state.bridgeState,
    bridgeStatusDetail: normalized.detail || state.bridgeStatusDetail,
    generationJobs: updateGenerationJobs(state.generationJobs, normalized.nonce, (job) => ({
      ...job,
      status: normalized.status,
      detail: normalized.detail || job.detail,
      bridgeState: normalized.bridgeState || job.bridgeState,
      canRetry: !!normalized.canRetry,
      errorMessage: normalized.status === 'failed' || normalized.status === 'retryable'
        ? normalized.detail || job.errorMessage
        : job.errorMessage,
      completedAt: normalized.status === 'succeeded' ? new Date().toISOString() : job.completedAt
    }))
  }));

  if (normalized.status === 'retryable' || normalized.status === 'waiting_visibility' || normalized.status === 'bridge_unavailable') {
    set({ actionStatus: buildGenerationStatusMessage(normalized) });
    return;
  }

  if (normalized.status === 'failed') {
    set({ actionStatus: buildGenerationFailureMessage(normalized.detail) });
  }
}

function handleGenerationImage(set, get, payload) {
  const nonce = payload?.nonce;
  if (!nonce) {
    set({ actionStatus: buildGenerationFailureMessage('Result payload missing nonce.') });
    return;
  }

  const matchingJob = get().generationJobs.find((job) => job.nonce === nonce);
  if (!matchingJob) {
    set({ actionStatus: buildStaleResultMessage() });
    return;
  }

  if (matchingJob.supersededByNonce) {
    set({ actionStatus: buildStaleResultMessage() });
    return;
  }

  set((state) => ({
    generationJobs: updateGenerationJobs(state.generationJobs, nonce, (job) => ({
      ...job,
      status: 'succeeded',
      detail: payload.detail || 'Image received',
      completedAt: new Date().toISOString(),
      resultDataUrl: payload.dataUrl,
      canRetry: false,
      errorMessage: ''
    })),
    actionStatus: 'Venice image received'
  }));
}

function handleGenerationError(set, get, payload) {
  const nonce = payload?.nonce;
  const detail = payload?.message || payload?.detail || 'Venice bridge recovery failed.';

  if (!nonce) {
    set({ actionStatus: buildGenerationFailureMessage(detail) });
    return;
  }

  set((state) => ({
    generationJobs: updateGenerationJobs(state.generationJobs, nonce, (job) => ({
      ...job,
      status: 'failed',
      detail,
      errorMessage: detail,
      canRetry: true
    })),
    actionStatus: buildGenerationFailureMessage(detail)
  }));
}

function updateGenerationJobs(jobs, nonce, updateJob) {
  return jobs.map((job) => {
    if (job.nonce !== nonce) {
      return job;
    }

    return updateJob(job);
  });
}

function buildBridgeRecoveryMessage(detail = '') {
  const suffix = detail ? ` ${detail}` : '';
  return `Venice bridge unavailable.${suffix} Install the bridge userscript, sign in to Venice.ai, and keep a Venice tab visible before retrying.`;
}

function buildGenerationStatusMessage(normalized) {
  if (normalized.status === 'waiting_visibility') {
    return 'Venice needs a visible browser tab before the job can continue. Bring Venice.ai to the foreground and retry if needed.';
  }

  if (normalized.status === 'bridge_unavailable') {
    return buildBridgeRecoveryMessage(normalized.detail);
  }

  return `Venice job needs recovery: ${normalized.detail || 'Retry when the bridge is ready.'}`;
}

function buildGenerationFailureMessage(detail = '') {
  return `Venice recovery failed. ${detail}`.trim();
}

function buildStaleResultMessage() {
  return 'Ignored a stale Venice result because that nonce was already superseded by a newer retry.';
}

function createGenerationNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `venice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneData(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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
