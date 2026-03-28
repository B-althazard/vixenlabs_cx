import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateModels,
  validateSchemaBundle,
  validateSystemPresets
} from '../src/lib/contentValidation.js';

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

describe('content validation fixtures', () => {
  it('rejects schema bundles with unknown option references', () => {
    const schemaBundle = loadSchemaBundle();
    const invalidSchemaBundle = structuredClone(schemaBundle);

    invalidSchemaBundle.categories
      .find((category) => category.id === 'lighting')
      .definition.fields.find((field) => field.id === 'lightStyle')
      .options.find((option) => option.id === 'neon-rim')
      .suggests = ['locationType:missing-location'];

    expect(() => validateSchemaBundle(invalidSchemaBundle)).toThrow(
      /unknown option locationType:missing-location/
    );
  });

  it('rejects models with missing ids', () => {
    const models = loadModels();
    const invalidModels = structuredClone(models);

    delete invalidModels['lustify-v7'].id;

    expect(() => validateModels(invalidModels)).toThrow(/missing id/);
  });

  it('rejects system presets with unknown model, field, option, or invalid value shape', () => {
    const schemaBundle = validateSchemaBundle(loadSchemaBundle());
    const models = validateModels(loadModels());
    const presets = readJson('public/presets/system-presets.json');

    const unknownModelPresets = structuredClone(presets);
    unknownModelPresets[0].selectedModelId = 'missing-model';
    expect(() => validateSystemPresets(unknownModelPresets, schemaBundle, models)).toThrow(
      /unknown model missing-model/
    );

    const unknownFieldPresets = structuredClone(presets);
    unknownFieldPresets[0].formValues.unknownField = 'female';
    expect(() => validateSystemPresets(unknownFieldPresets, schemaBundle, models)).toThrow(
      /unknown field unknownField/
    );

    const unknownOptionPresets = structuredClone(presets);
    unknownOptionPresets[0].formValues.age = 'missing-age';
    expect(() => validateSystemPresets(unknownOptionPresets, schemaBundle, models)).toThrow(
      /unknown option age:missing-age/
    );

    const invalidShapePresets = structuredClone(presets);
    invalidShapePresets[0].formValues.eyeColor = 'green';
    expect(() => validateSystemPresets(invalidShapePresets, schemaBundle, models)).toThrow(
      /must use an array/
    );
  });
});

describe('shipped content contract', () => {
  it('ships production assets without placeholder markers', () => {
    const assetPaths = [
      'public/schema/index.json',
      'public/schema/categories/identity.json',
      'public/schema/categories/face.json',
      'public/schema/categories/eyes.json',
      'public/schema/categories/body.json',
      'public/schema/categories/makeup.json',
      'public/schema/categories/lingerie.json',
      'public/schema/categories/location.json',
      'public/schema/categories/lighting.json',
      'public/schema/categories/camera.json',
      'public/schema/categories/futa-attributes.json',
      'public/presets/system-presets.json'
    ];

    assetPaths.forEach((assetPath) => {
      const content = readFileSync(path.join(repoRoot, assetPath), 'utf8');
      expect(content, `${assetPath} should not contain placeholder ids`).not.toContain(
        'placeholder-'
      );
      expect(content, `${assetPath} should not ship placeholder flags`).not.toContain(
        '"placeholder": true'
      );
    });
  });

  it('keeps every system preset aligned with live schema and model ids', () => {
    const schemaBundle = validateSchemaBundle(loadSchemaBundle());
    const models = validateModels(loadModels());
    const presets = readJson('public/presets/system-presets.json');

    expect(() => validateSystemPresets(presets, schemaBundle, models)).not.toThrow();
  });
});
