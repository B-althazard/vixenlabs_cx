export async function loadJson(path) {
  const normalizedPath = path.replace(/^\//, '');
  const response = await fetch(`${import.meta.env.BASE_URL}${normalizedPath}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

export async function loadSchemaBundle() {
  const manifest = await loadJson('/schema/index.json');
  const categories = await Promise.all(
    manifest.categories.map(async (category) => ({
      ...category,
      definition: await loadJson(category.file)
    }))
  );

  return {
    ...manifest,
    categories
  };
}

export async function loadModels() {
  const files = [
    '/models/chroma1-hd.json',
    '/models/z-image-turbo.json',
    '/models/lustify-v7.json',
    '/models/lustify-sdxl.json'
  ];

  const models = await Promise.all(files.map(loadJson));

  return models.reduce((accumulator, model) => {
    accumulator[model.id] = model;
    return accumulator;
  }, {});
}

export async function loadSystemPresets() {
  return loadJson('/presets/system-presets.json');
}

export function flattenSchema(schemaBundle) {
  return schemaBundle.categories.flatMap((category) =>
    category.definition.fields.map((field) => ({
      ...field,
      categoryId: category.id,
      categoryLabel: category.label
    }))
  );
}

export function createDefaultFormValues(schemaBundle) {
  const fields = flattenSchema(schemaBundle);
  return fields.reduce((accumulator, field) => {
    if (field.type === 'multi-select') {
      accumulator[field.id] = [];
      return accumulator;
    }

    const firstOption = field.options?.[0];
    accumulator[field.id] = firstOption ? firstOption.id : null;
    return accumulator;
  }, {});
}

export function createDefaultLocks(schemaBundle) {
  const fields = flattenSchema(schemaBundle);
  return fields.reduce((accumulator, field) => {
    accumulator[field.id] = false;
    return accumulator;
  }, {});
}

export function buildFieldIndex(schemaBundle) {
  const fields = flattenSchema(schemaBundle);
  return fields.reduce((accumulator, field) => {
    accumulator[field.id] = field;
    return accumulator;
  }, {});
}
