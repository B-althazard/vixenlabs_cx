function ensureArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function ensureNonEmptyString(value, message) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
}

function ensureObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

function createFieldIndex(schemaBundle) {
  return schemaBundle.categories.reduce((fieldAccumulator, category, categoryIndex) => {
    ensureObject(category.definition, `Schema category ${category.id} is missing a definition object`);
    ensureArray(
      category.definition.fields,
      `Schema category ${category.id} is missing a fields array`
    );

    category.definition.fields.forEach((field, fieldIndex) => {
      ensureObject(
        field,
        `Schema category ${category.id} field ${fieldIndex} must be an object`
      );
      ensureNonEmptyString(
        field.id,
        `Schema category ${category.id} field ${fieldIndex} is missing an id`
      );
      ensureNonEmptyString(
        field.label,
        `Schema field ${field.id} is missing a label`
      );
      ensureNonEmptyString(
        field.type,
        `Schema field ${field.id} is missing a type`
      );
      ensureArray(
        field.options,
        `Schema field ${field.id} is missing an options array`
      );

      if (fieldAccumulator[field.id]) {
        throw new Error(`Schema field ids must be unique: ${field.id}`);
      }

      const optionIndex = field.options.reduce((optionAccumulator, option, optionPosition) => {
        ensureObject(
          option,
          `Schema field ${field.id} option ${optionPosition} must be an object`
        );
        ensureNonEmptyString(
          option.id,
          `Schema field ${field.id} option ${optionPosition} is missing an id`
        );
        ensureNonEmptyString(
          option.label,
          `Schema field ${field.id} option ${option.id} is missing a label`
        );
        ensureNonEmptyString(
          option.promptValue,
          `Schema field ${field.id} option ${option.id} is missing a promptValue`
        );

        if (optionAccumulator[option.id]) {
          throw new Error(
            `Schema field ${field.id} option ids must be unique: ${option.id}`
          );
        }

        optionAccumulator[option.id] = option;
        return optionAccumulator;
      }, {});

      fieldAccumulator[field.id] = {
        category,
        categoryIndex,
        field,
        fieldIndex,
        options: optionIndex
      };
    });

    return fieldAccumulator;
  }, {});
}

function validateReference(reference, fieldIndex, context) {
  if (typeof reference !== 'string' || !reference.includes(':')) {
    throw new Error(`${context} has invalid reference ${reference}`);
  }

  const [fieldId, optionId] = reference.split(':');
  const targetField = fieldIndex[fieldId];

  if (!targetField) {
    throw new Error(`${context} references unknown field ${fieldId}`);
  }

  if (!targetField.options[optionId]) {
    throw new Error(`${context} references unknown option ${fieldId}:${optionId}`);
  }
}

function validateFieldBehavior(fieldIndex) {
  Object.values(fieldIndex).forEach(({ field }) => {
    field.options.forEach((option) => {
      const context = `Schema field ${field.id} option ${option.id}`;

      if (option.togglesCategory !== undefined) {
        ensureNonEmptyString(
          option.togglesCategory,
          `${context} has an empty togglesCategory`
        );
      }

      if (option.disables !== undefined) {
        ensureArray(option.disables, `${context} disables must be an array`);
        option.disables.forEach((fieldId) => {
          if (!fieldIndex[fieldId]) {
            throw new Error(`${context} disables unknown field ${fieldId}`);
          }
        });
      }

      if (option.suggests !== undefined) {
        ensureArray(option.suggests, `${context} suggests must be an array`);
        option.suggests.forEach((reference) => validateReference(reference, fieldIndex, context));
      }

      if (option.incompatibleWith !== undefined) {
        ensureArray(
          option.incompatibleWith,
          `${context} incompatibleWith must be an array`
        );
        option.incompatibleWith.forEach((reference) =>
          validateReference(reference, fieldIndex, context)
        );
      }
    });

    if (field.synergy !== undefined) {
      ensureObject(field.synergy, `Schema field ${field.id} synergy must be an object`);

      Object.entries(field.synergy).forEach(([selectionCount, synergyOption]) => {
        if (!/^\d+$/.test(selectionCount)) {
          throw new Error(`Schema field ${field.id} has invalid synergy key ${selectionCount}`);
        }

        ensureObject(
          synergyOption,
          `Schema field ${field.id} synergy ${selectionCount} must be an object`
        );
        ensureNonEmptyString(
          synergyOption.id,
          `Schema field ${field.id} synergy ${selectionCount} is missing an id`
        );
        ensureNonEmptyString(
          synergyOption.label,
          `Schema field ${field.id} synergy ${selectionCount} is missing a label`
        );
        ensureNonEmptyString(
          synergyOption.promptValue,
          `Schema field ${field.id} synergy ${selectionCount} is missing a promptValue`
        );
      });
    }
  });
}

export function validateSchemaBundle(schemaBundle) {
  ensureObject(schemaBundle, 'Schema bundle must be an object');
  ensureNonEmptyString(schemaBundle.version, 'Schema bundle is missing version');
  ensureArray(schemaBundle.categories, 'Schema bundle is missing categories array');

  const categoryIds = new Set();
  const fieldIndex = createFieldIndex(schemaBundle);

  schemaBundle.categories.forEach((category, categoryIndex) => {
    ensureObject(category, `Schema category ${categoryIndex} must be an object`);
    ensureNonEmptyString(category.id, `Schema category ${categoryIndex} is missing id`);
    ensureNonEmptyString(
      category.label,
      `Schema category ${category.id} is missing label`
    );
    ensureNonEmptyString(
      category.file,
      `Schema category ${category.id} is missing file`
    );

    if (categoryIds.has(category.id)) {
      throw new Error(`Schema categories must be unique: ${category.id}`);
    }

    categoryIds.add(category.id);

    if (category.definition.id !== category.id) {
      throw new Error(
        `Schema category ${category.id} definition id mismatch: ${category.definition.id}`
      );
    }
  });

  validateFieldBehavior(fieldIndex);

  Object.values(fieldIndex).forEach(({ field }) => {
    field.options.forEach((option) => {
      if (option.togglesCategory && !categoryIds.has(option.togglesCategory)) {
        throw new Error(
          `Schema field ${field.id} option ${option.id} toggles unknown category ${option.togglesCategory}`
        );
      }
    });
  });

  return schemaBundle;
}

export function validateModels(models) {
  ensureObject(models, 'Models payload must be an object');

  Object.entries(models).forEach(([modelId, model]) => {
    ensureObject(model, `Model ${modelId} must be an object`);
    ensureNonEmptyString(model.id, `Model ${modelId} is missing id`);

    if (model.id !== modelId) {
      throw new Error(`Model key ${modelId} does not match model id ${model.id}`);
    }

    ensureNonEmptyString(model.label, `Model ${model.id} is missing label`);
    ensureArray(model.ordering, `Model ${model.id} is missing ordering array`);

    if (!Array.isArray(model.qualityPrefix)) {
      throw new Error(`Model ${model.id} is missing qualityPrefix array`);
    }

    if (!Array.isArray(model.negativeBase)) {
      throw new Error(`Model ${model.id} is missing negativeBase array`);
    }
  });

  return models;
}

export function validateSystemPresets(systemPresets, schemaBundle, models) {
  ensureArray(systemPresets, 'System presets payload must be an array');

  const fieldIndex = createFieldIndex(schemaBundle);
  const modelIds = new Set(Object.keys(models));
  const presetIds = new Set();

  systemPresets.forEach((preset, presetIndex) => {
    ensureObject(preset, `System preset ${presetIndex} must be an object`);
    ensureNonEmptyString(preset.id, `System preset ${presetIndex} is missing id`);
    ensureNonEmptyString(preset.name, `System preset ${preset.id} is missing name`);
    ensureNonEmptyString(
      preset.selectedModelId,
      `System preset ${preset.id} is missing selectedModelId`
    );
    ensureObject(
      preset.formValues,
      `System preset ${preset.id} is missing formValues object`
    );

    if (presetIds.has(preset.id)) {
      throw new Error(`System preset ids must be unique: ${preset.id}`);
    }

    presetIds.add(preset.id);

    if (!modelIds.has(preset.selectedModelId)) {
      throw new Error(
        `System preset ${preset.id} references unknown model ${preset.selectedModelId}`
      );
    }

    Object.entries(preset.formValues).forEach(([fieldId, value]) => {
      const field = fieldIndex[fieldId]?.field;

      if (!field) {
        throw new Error(`System preset ${preset.id} references unknown field ${fieldId}`);
      }

      const optionIds = new Set(field.options.map((option) => option.id));

      if (field.type === 'multi-select') {
        if (!Array.isArray(value)) {
          throw new Error(
            `System preset ${preset.id} field ${fieldId} must use an array`
          );
        }

        value.forEach((optionId) => {
          if (!optionIds.has(optionId)) {
            throw new Error(
              `System preset ${preset.id} references unknown option ${fieldId}:${optionId}`
            );
          }
        });
        return;
      }

      if (Array.isArray(value)) {
        throw new Error(
          `System preset ${preset.id} field ${fieldId} must use a single option id`
        );
      }

      if (!optionIds.has(value)) {
        throw new Error(
          `System preset ${preset.id} references unknown option ${fieldId}:${value}`
        );
      }
    });
  });

  return systemPresets;
}
