import { buildFieldIndex, createDefaultFormValues } from './schema';

function createNotice(type, source, message) {
  return { type, source, message };
}

function getFallbackModelId(models) {
  return Object.keys(models || {})[0] || null;
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function createFieldHelpers(schemaBundle) {
  const fieldIndex = buildFieldIndex(schemaBundle);
  const defaultValues = createDefaultFormValues(schemaBundle);

  return { fieldIndex, defaultValues };
}

function sanitizeFormValues(schemaBundle, rawFormValues, notices, sourceLabel) {
  const { fieldIndex, defaultValues } = createFieldHelpers(schemaBundle);
  const nextValues = { ...defaultValues };
  let quarantined = 0;

  if (!isObject(rawFormValues)) {
    if (rawFormValues != null) {
      notices.push(
        createNotice(
          'recovery',
          sourceLabel,
          'Reset malformed selections to schema defaults.'
        )
      );
    }

    return { value: nextValues, quarantined };
  }

  Object.entries(rawFormValues).forEach(([fieldId, rawValue]) => {
    const field = fieldIndex[fieldId];

    if (!field) {
      quarantined += 1;
      notices.push(
        createNotice(
          'recovery',
          sourceLabel,
          `Removed unknown field ${fieldId}.`
        )
      );
      return;
    }

    const optionIds = new Set(field.options.map((option) => option.id));

    if (field.type === 'multi-select') {
      if (!Array.isArray(rawValue)) {
        if (rawValue != null) {
          notices.push(
            createNotice(
              'recovery',
              sourceLabel,
              `Reset ${field.label} because the saved value was malformed.`
            )
          );
        }
        nextValues[fieldId] = [];
        return;
      }

      const filtered = rawValue.filter((optionId) => optionIds.has(optionId));
      quarantined += rawValue.length - filtered.length;
      if (filtered.length !== rawValue.length) {
        notices.push(
          createNotice(
            'recovery',
            sourceLabel,
            `Removed incompatible ${field.label.toLowerCase()} selections.`
          )
        );
      }
      nextValues[fieldId] = filtered;
      return;
    }

    if (rawValue == null) {
      nextValues[fieldId] = null;
      return;
    }

    if (!optionIds.has(rawValue)) {
      quarantined += 1;
      notices.push(
        createNotice(
          'recovery',
          sourceLabel,
          `Reset ${field.label} to a valid option.`
        )
      );
      nextValues[fieldId] = defaultValues[fieldId];
      return;
    }

    nextValues[fieldId] = rawValue;
  });

  return { value: nextValues, quarantined };
}

function sanitizeSelectedModelId(models, rawModelId, notices, sourceLabel) {
  const fallbackModelId = getFallbackModelId(models);

  if (typeof rawModelId === 'string' && models?.[rawModelId]) {
    return rawModelId;
  }

  if (rawModelId != null) {
    notices.push(
      createNotice(
        'recovery',
        sourceLabel,
        'Replaced an unknown model with the current default model.'
      )
    );
  }

  return fallbackModelId;
}

function sanitizeLocks(schemaBundle, rawLocks, notices) {
  const { fieldIndex } = createFieldHelpers(schemaBundle);

  if (!isObject(rawLocks)) {
    if (rawLocks != null) {
      notices.push(
        createNotice('recovery', 'Saved settings', 'Reset malformed field locks.')
      );
    }
    return {};
  }

  return Object.entries(rawLocks).reduce((accumulator, [fieldId, value]) => {
    if (!fieldIndex[fieldId]) {
      notices.push(
        createNotice('recovery', 'Saved settings', `Removed lock for unknown field ${fieldId}.`)
      );
      return accumulator;
    }

    accumulator[fieldId] = !!value;
    return accumulator;
  }, {});
}

function sanitizePreset(schemaBundle, models, preset, index, sourceLabel) {
  const notices = [];

  if (!isObject(preset) || !isObject(preset.formValues)) {
    return {
      value: null,
      notices: [
        createNotice(
          'recovery',
          sourceLabel,
          `Quarantined malformed preset at position ${index + 1}.`
        )
      ],
      quarantined: 1
    };
  }

  const sanitizedFormValues = sanitizeFormValues(
    schemaBundle,
    preset.formValues,
    notices,
    preset.name || `Preset ${index + 1}`
  );

  return {
    value: {
      ...preset,
      type: 'user',
      id: typeof preset.id === 'string' && preset.id.trim() ? preset.id : `sanitized-preset-${index + 1}`,
      name: typeof preset.name === 'string' && preset.name.trim() ? preset.name : `Recovered preset ${index + 1}`,
      createdAt: typeof preset.createdAt === 'string' && preset.createdAt.trim()
        ? preset.createdAt
        : new Date(0).toISOString(),
      selectedModelId: sanitizeSelectedModelId(
        models,
        preset.selectedModelId,
        notices,
        preset.name || `Preset ${index + 1}`
      ),
      formValues: sanitizedFormValues.value
    },
    notices,
    quarantined: sanitizedFormValues.quarantined
  };
}

export function sanitizeSettings(schemaBundle, models, rawSettings, metadata = {}) {
  const notices = [];
  const value = isObject(rawSettings) ? rawSettings : {};
  const sanitizedFormValues = sanitizeFormValues(
    schemaBundle,
    value.formValues,
    notices,
    'Saved settings'
  );

  return {
    value: {
      selectedModelId: sanitizeSelectedModelId(
        models,
        value.selectedModelId,
        notices,
        'Saved settings'
      ),
      formValues: sanitizedFormValues.value,
      locks: sanitizeLocks(schemaBundle, value.locks, notices),
      activeCategoryId: typeof value.activeCategoryId === 'string' ? value.activeCategoryId : null,
      storageVersion: metadata.storageVersion || '',
      schemaVersion: metadata.schemaVersion || schemaBundle.version
    },
    notices,
    quarantined: sanitizedFormValues.quarantined
  };
}

export function sanitizePresetCollection(schemaBundle, models, rawPresets, sourceLabel = 'Saved presets') {
  const notices = [];
  const presets = Array.isArray(rawPresets) ? rawPresets : [];
  let quarantined = Array.isArray(rawPresets) ? 0 : rawPresets == null ? 0 : 1;

  if (!Array.isArray(rawPresets) && rawPresets != null) {
    notices.push(
      createNotice('recovery', sourceLabel, 'Quarantined malformed preset collection.')
    );
  }

  const value = presets.reduce((accumulator, preset, index) => {
    const sanitized = sanitizePreset(schemaBundle, models, preset, index, sourceLabel);
    notices.push(...sanitized.notices);
    quarantined += sanitized.quarantined;

    if (sanitized.value) {
      accumulator.push(sanitized.value);
    }

    return accumulator;
  }, []);

  return { value, notices, quarantined };
}

export function sanitizeGalleryEntries(schemaBundle, models, rawEntries) {
  const notices = [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  let quarantined = Array.isArray(rawEntries) ? 0 : rawEntries == null ? 0 : 1;

  if (!Array.isArray(rawEntries) && rawEntries != null) {
    notices.push(
      createNotice('recovery', 'Gallery', 'Quarantined malformed gallery payload.')
    );
  }

  const value = entries.reduce((accumulator, entry, index) => {
    if (!isObject(entry) || !isObject(entry.formValues)) {
      quarantined += 1;
      notices.push(
        createNotice('recovery', 'Gallery', `Quarantined malformed gallery entry ${index + 1}.`)
      );
      return accumulator;
    }

    const sanitizedFormValues = sanitizeFormValues(
      schemaBundle,
      entry.formValues,
      notices,
      entry.title || `Gallery entry ${index + 1}`
    );

    const nextEntry = {
      ...entry,
      selectedModelId: sanitizeSelectedModelId(
        models,
        entry.selectedModelId,
        notices,
        entry.title || `Gallery entry ${index + 1}`
      ),
      formValues: sanitizedFormValues.value,
      createdAt: typeof entry.createdAt === 'string' && entry.createdAt.trim()
        ? entry.createdAt
        : new Date(0).toISOString()
    };

    if (nextEntry.createdAt === new Date(0).toISOString() && entry.createdAt !== nextEntry.createdAt) {
      notices.push(
        createNotice('recovery', 'Gallery', 'Backfilled a missing gallery timestamp.')
      );
    }

    quarantined += sanitizedFormValues.quarantined;
    accumulator.push(nextEntry);
    return accumulator;
  }, []);

  return { value, notices, quarantined };
}

export function sanitizeImportedPresets(schemaBundle, models, rawPresets) {
  const sanitized = sanitizePresetCollection(schemaBundle, models, rawPresets, 'Preset import');

  return {
    value: sanitized.value.map((preset, index) => ({
      ...preset,
      id: `imported-preset-${index + 1}`
    })),
    notices: sanitized.notices,
    quarantined: sanitized.quarantined
  };
}
