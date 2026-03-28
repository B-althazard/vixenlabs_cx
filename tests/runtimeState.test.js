import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeGalleryEntries,
  sanitizeImportedPresets,
  sanitizePresetCollection,
  sanitizeSettings
} from '../src/lib/runtimeState.js';

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
  return [
    readJson('public/models/chroma1-hd.json'),
    readJson('public/models/z-image-turbo.json'),
    readJson('public/models/lustify-v7.json'),
    readJson('public/models/lustify-sdxl.json')
  ].reduce((accumulator, model) => {
    accumulator[model.id] = model;
    return accumulator;
  }, {});
}

describe('runtime state sanitizers', () => {
  it('falls back to a valid model and drops unknown saved fields', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const sanitized = sanitizeSettings(schemaBundle, models, {
      selectedModelId: 'missing-model',
      formValues: {
        characterType: 'female',
        unknownField: 'unknown-option'
      },
      locks: {
        unknownField: true,
        characterType: 1
      }
    });

    expect(sanitized.value.selectedModelId).toBe('chroma1-hd');
    expect(sanitized.value.formValues.unknownField).toBeUndefined();
    expect(sanitized.value.locks.characterType).toBe(true);
    expect(sanitized.notices.length).toBeGreaterThan(0);
    expect(sanitized.quarantined).toBeGreaterThan(0);
  });

  it('sanitizes preset collections and quarantines malformed entries', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const sanitized = sanitizePresetCollection(schemaBundle, models, [
      {
        id: 'preset-1',
        name: 'Imported look',
        selectedModelId: 'missing-model',
        formValues: {
          characterType: 'female',
          age: 'unknown-age'
        }
      },
      {
        id: 'broken'
      }
    ]);

    expect(sanitized.value).toHaveLength(1);
    expect(sanitized.value[0].selectedModelId).toBe('chroma1-hd');
    expect(sanitized.value[0].formValues.age).not.toBe('unknown-age');
    expect(sanitized.quarantined).toBeGreaterThan(0);
  });

  it('backfills gallery timestamps and resets invalid option ids', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const sanitized = sanitizeGalleryEntries(schemaBundle, models, [
      {
        id: 1,
        title: 'Old entry',
        selectedModelId: 'missing-model',
        formValues: {
          characterType: 'female',
          eyeColor: 'unknown-eye-color'
        }
      }
    ]);

    expect(sanitized.value[0].createdAt).toBe('1970-01-01T00:00:00.000Z');
    expect(sanitized.value[0].selectedModelId).toBe('chroma1-hd');
    expect(sanitized.value[0].formValues.eyeColor).not.toBe('unknown-eye-color');
    expect(sanitized.notices.some((notice) => notice.message.includes('timestamp'))).toBe(true);
  });

  it('sanitizes malformed imports without returning unusable presets', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const sanitized = sanitizeImportedPresets(schemaBundle, models, {
      not: 'an array'
    });

    expect(sanitized.value).toEqual([]);
    expect(sanitized.notices.length).toBeGreaterThan(0);
    expect(sanitized.quarantined).toBeGreaterThan(0);
  });
});
