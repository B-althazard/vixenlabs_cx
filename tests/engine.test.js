import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFieldIndex, createDefaultFormValues } from '../src/lib/schema.js';
import { randomizeForm, resolveState } from '../src/lib/engines.js';

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

describe('engine resolution', () => {
  it('clears conflicting camera and pose combinations', () => {
    const schemaBundle = loadSchemaBundle();
    const resolved = resolveState(schemaBundle, {
      ...createDefaultFormValues(schemaBundle),
      stance: 'standing',
      cameraAngle: 'top-down',
      shotType: 'full-body'
    });

    expect(resolved.values.cameraAngle).not.toBe('top-down');
    expect(resolved.evaluation.notices.some((notice) => notice.type === 'reset')).toBe(true);
  });

  it('respects locks during randomization', () => {
    const schemaBundle = loadSchemaBundle();
    const fieldIndex = buildFieldIndex(schemaBundle);
    const startValues = {
      ...createDefaultFormValues(schemaBundle),
      age: '30s',
      hairColor: 'black'
    };
    const result = randomizeForm(
      schemaBundle,
      fieldIndex,
      startValues,
      { age: true, hairColor: true, hairStyle: true },
      resolvedDisabled(schemaBundle, startValues)
    );

    expect(result.values.age).toBe('30s');
    expect(result.values.hairColor).toBe('black');
  });
});

describe('system presets', () => {
  it('ships exactly nine female system presets in fixed order', () => {
    const presets = readJson('public/presets/system-presets.json');

    expect(presets).toHaveLength(9);
    expect(presets.map((preset) => preset.name)).toEqual([
      'Lyndie',
      'Vivienne',
      'Sarah',
      'Simone',
      'Dorien',
      'Noa',
      'Marisol',
      'Celeste',
      'Roxanne'
    ]);
    expect(presets.every((preset) => preset.formValues.characterType === 'female')).toBe(true);
  });

  it('uses only known model ids and schema option ids', () => {
    const presets = readJson('public/presets/system-presets.json');
    const schemaBundle = loadSchemaBundle();
    const models = [
      readJson('public/models/chroma1-hd.json').id,
      readJson('public/models/z-image-turbo.json').id,
      readJson('public/models/lustify-v7.json').id,
      readJson('public/models/lustify-sdxl.json').id
    ];

    const fieldMap = buildFieldIndex(schemaBundle);

    for (const preset of presets) {
      expect(models).toContain(preset.selectedModelId);
      for (const [fieldId, value] of Object.entries(preset.formValues)) {
        const field = fieldMap[fieldId];
        expect(field, `${preset.name} references unknown field ${fieldId}`).toBeTruthy();
        const optionIds = field.options.map((option) => option.id);
        if (Array.isArray(value)) {
          value.forEach((item) => expect(optionIds, `${preset.name} invalid option ${fieldId}:${item}`).toContain(item));
        } else {
          expect(optionIds, `${preset.name} invalid option ${fieldId}:${value}`).toContain(value);
        }
      }
    }
  });
});

function resolvedDisabled(schemaBundle, values) {
  return resolveState(schemaBundle, values).evaluation.disabled;
}
