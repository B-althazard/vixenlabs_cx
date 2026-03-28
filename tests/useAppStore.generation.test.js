import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dispatchGenerationRequest = vi.fn();
const unsubscribeBridge = vi.fn();
let bridgeHandlers = null;

vi.mock('dexie', () => {
  const rows = [];

  class DexieMock {
    constructor() {
      this.images = {
        put: vi.fn(async (entry) => {
          const existingIndex = rows.findIndex((row) => row.id === entry.id || row.nonce === entry.nonce);
          if (existingIndex >= 0) {
            rows.splice(existingIndex, 1, entry);
          } else {
            rows.push(entry);
          }
          return entry.id || entry.nonce;
        }),
        orderBy: vi.fn(() => ({
          reverse: () => ({
            toArray: async () => [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          })
        }))
      };
    }

    version() {
      return {
        stores() {
          return this;
        }
      };
    }
  }

  return {
    default: DexieMock
  };
});

vi.mock('../src/lib/veniceBridge.js', () => ({
  dispatchGenerationRequest,
  normalizeBridgeStatus: (payload) => payload,
  subscribeToVeniceBridge: vi.fn((handlers) => {
    bridgeHandlers = handlers;
    return unsubscribeBridge;
  })
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function loadSchemaBundle() {
  const manifest = readJson('public/schema/index.json');
  return {
    ...manifest,
    categories: manifest.categories.map((category) => ({
      ...category,
      definition: readJson(path.join('public', category.file.replace(/^\//, '')))
    }))
  };
}

function loadModels() {
  return {
    'chroma1-hd': readJson('public/models/chroma1-hd.json'),
    'z-image-turbo': readJson('public/models/z-image-turbo.json'),
    'lustify-v7': readJson('public/models/lustify-v7.json'),
    'lustify-sdxl': readJson('public/models/lustify-sdxl.json')
  };
}

function createWindowMock() {
  const eventTarget = new EventTarget();

  return {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget)
  };
}

describe('useAppStore generation flow', async () => {
  const { createInitializedState, useAppStore } = await import('../src/store/useAppStore.js');

  function seedLoadedStore() {
    const baseState = useAppStore.getInitialState();
    const loadedState = createInitializedState({
      schemaBundle: loadSchemaBundle(),
      models: loadModels(),
      systemPresets: [],
      settingsRecord: {},
      userPresetRecord: {},
      galleryEntries: []
    });

    useAppStore.setState({
      ...baseState,
      ...loadedState
    }, true);
  }

  beforeEach(() => {
    bridgeHandlers = null;
    dispatchGenerationRequest.mockReset();
    unsubscribeBridge.mockReset();
    vi.stubGlobal('window', createWindowMock());
    seedLoadedStore();
  });

  it('creates a queued job snapshot before bridge dispatch and tracks lifecycle transitions', async () => {
    const state = useAppStore.getState();

    expect(typeof state.submitGeneration).toBe('function');
    expect(typeof state.retryGeneration).toBe('function');
    expect(typeof state.setupGenerationBridge).toBe('function');

    state.setupGenerationBridge();
    bridgeHandlers.onReady({ source: 'userscript' });
    await state.submitGeneration();

    const queuedJob = useAppStore.getState().generationJobs[0];
    expect(queuedJob).toBeTruthy();
    expect(queuedJob.status).toBe('queued');
    expect(queuedJob.nonce).toEqual(expect.any(String));
    expect(queuedJob.formValuesSnapshot).toEqual(useAppStore.getState().formValues);
    expect(queuedJob.selectedModelId).toBe(useAppStore.getState().selectedModelId);
    expect(queuedJob.promptPackageSnapshot).toEqual(useAppStore.getState().promptPackage);
    expect(queuedJob.generationPayload).toEqual(useAppStore.getState().promptPackage.generationPayload);
    expect(dispatchGenerationRequest).toHaveBeenCalledWith(expect.objectContaining({
      nonce: queuedJob.nonce,
      prompt: queuedJob.generationPayload.prompt,
      settings: queuedJob.generationPayload.settings
    }));

    bridgeHandlers.onStatus({ nonce: queuedJob.nonce, status: 'running', detail: 'Submitting' });
    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: queuedJob.nonce,
      status: 'running',
      detail: 'Submitting'
    });

    bridgeHandlers.onStatus({ nonce: queuedJob.nonce, status: 'retryable', detail: 'Selector drift', canRetry: true });
    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: queuedJob.nonce,
      status: 'retryable',
      canRetry: true,
      detail: 'Selector drift'
    });

    bridgeHandlers.onStatus({ nonce: queuedJob.nonce, status: 'succeeded', detail: 'Complete' });
    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: queuedJob.nonce,
      status: 'succeeded',
      detail: 'Complete'
    });
  });

  it('surfaces a clear recovery message when the bridge is unavailable', async () => {
    await useAppStore.getState().submitGeneration();

    expect(dispatchGenerationRequest).not.toHaveBeenCalled();
    expect(useAppStore.getState().actionStatus).toMatch(/bridge/i);
    expect(useAppStore.getState().actionStatus).toMatch(/install|sign in|visible|ready/i);
  });

  it('binds image results to the matching nonce and ignores stale retry results', async () => {
    const state = useAppStore.getState();
    state.setupGenerationBridge();
    bridgeHandlers.onReady({ source: 'userscript' });

    await state.submitGeneration();
    const firstJob = useAppStore.getState().generationJobs[0];

    bridgeHandlers.onStatus({
      nonce: firstJob.nonce,
      status: 'retryable',
      detail: 'Selector drift',
      canRetry: true
    });

    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: firstJob.nonce,
      status: 'retryable',
      resultDataUrl: null
    });

    await useAppStore.getState().retryGeneration(firstJob.nonce);
    const [retryJob, originalJob] = useAppStore.getState().generationJobs;

    expect(retryJob.nonce).not.toBe(firstJob.nonce);
    expect(retryJob.attempt).toBe(2);
    expect(originalJob.nonce).toBe(firstJob.nonce);

    bridgeHandlers.onImage({
      nonce: firstJob.nonce,
      dataUrl: 'data:image/png;base64,first'
    });

    expect(useAppStore.getState().generationJobs[1]).toMatchObject({
      nonce: firstJob.nonce,
      status: 'retryable',
      resultDataUrl: null
    });

    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: retryJob.nonce,
      resultDataUrl: null
    });
    expect(useAppStore.getState().actionStatus).toMatch(/stale|ignored/i);

    bridgeHandlers.onError({ nonce: retryJob.nonce, message: 'Bridge hidden tab recovery required' });
    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: retryJob.nonce,
      status: 'failed'
    });
    expect(useAppStore.getState().actionStatus).toMatch(/recovery/i);
  });

  it('persists successful image results into gallery state immediately', async () => {
    const state = useAppStore.getState();
    state.setupGenerationBridge();
    bridgeHandlers.onReady({ source: 'userscript' });

    await state.submitGeneration();
    const job = useAppStore.getState().generationJobs[0];

    await bridgeHandlers.onImage({
      nonce: job.nonce,
      detail: 'Image received',
      dataUrl: 'data:image/png;base64,abc123'
    });

    expect(useAppStore.getState().generationJobs[0]).toMatchObject({
      nonce: job.nonce,
      status: 'succeeded',
      resultDataUrl: 'data:image/png;base64,abc123'
    });
    expect(useAppStore.getState().gallery[0]).toMatchObject({
      nonce: job.nonce,
      status: 'succeeded',
      resultDataUrl: 'data:image/png;base64,abc123'
    });
  });

});
