import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDefaultFormValues } from '../src/lib/schema.js';
import { buildGenerationPayload } from '../src/lib/engines.js';

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

describe('model generation config', () => {
  it('exposes generation provider, supports, and defaults for every shipped model', () => {
    const models = Object.values(loadModels());

    for (const model of models) {
      expect(model.generation).toBeTruthy();
      expect(model.generation.provider).toBe('venice-bridge');
      expect(model.generation.supports).toBeTruthy();
      expect(model.generation.defaults).toBeTruthy();
    }
  });
});

describe('generation payload builder', () => {
  it('returns prompt and config-driven settings for chroma1-hd', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const formValues = createDefaultFormValues(schemaBundle);
    const visibleCategories = Object.fromEntries(
      schemaBundle.categories.map((category) => [category.id, category.visible])
    );

    const payload = buildGenerationPayload(
      schemaBundle,
      models,
      'chroma1-hd',
      formValues,
      visibleCategories
    );

    expect(payload.prompt).toEqual(expect.any(String));
    expect(payload.settings).toMatchObject({
      model: 'chroma1-hd',
      steps: models['chroma1-hd'].recommendedSettings.steps,
      cfg_scale: models['chroma1-hd'].recommendedSettings.cfg_scale,
      sampler: models['chroma1-hd'].recommendedSettings.sampler
    });
    expect(payload.negativePrompt).toEqual(expect.any(String));
    expect(payload.supports.negativePrompt).toBe(true);
  });

  it('omits unsupported negativePrompt for z-image-turbo while exposing support metadata', () => {
    const schemaBundle = loadSchemaBundle();
    const models = loadModels();
    const formValues = createDefaultFormValues(schemaBundle);
    const visibleCategories = Object.fromEntries(
      schemaBundle.categories.map((category) => [category.id, category.visible])
    );

    expect(models['z-image-turbo'].generation.supports.negativePrompt).toBe(false);

    const payload = buildGenerationPayload(
      schemaBundle,
      models,
      'z-image-turbo',
      formValues,
      visibleCategories
    );

    expect(payload).not.toHaveProperty('negativePrompt');
    expect(payload.supports).toMatchObject({
      negativePrompt: false,
      style: 'none'
    });
    expect(payload.settings).toMatchObject({
      model: 'z-image-turbo',
      steps: models['z-image-turbo'].recommendedSettings.steps,
      cfg_scale: models['z-image-turbo'].recommendedSettings.cfg_scale,
      sampler: models['z-image-turbo'].recommendedSettings.sampler
    });
  });
});
