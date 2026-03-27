const PROMPT_BLOCK_LABELS = {
  identity: 'Identity',
  face: 'Face',
  eyes: 'Eyes',
  hair: 'Hair',
  body: 'Body',
  makeup: 'Makeup',
  lingerie: 'Lingerie',
  posing: 'Pose',
  location: 'Location',
  lighting: 'Lighting',
  camera: 'Camera',
  'futa-attributes': 'Futa'
};

export function evaluateState(schemaBundle, formValues) {
  const disabled = {};
  const visibleCategories = {};

  for (const category of schemaBundle.categories) {
    visibleCategories[category.id] = category.visible;
  }

  for (const category of schemaBundle.categories) {
    for (const field of category.definition.fields) {
      disabled[field.id] = false;
    }
  }

  for (const category of schemaBundle.categories) {
    for (const field of category.definition.fields) {
      const selectedOptionIds = Array.isArray(formValues[field.id])
        ? formValues[field.id]
        : [formValues[field.id]];

      for (const option of field.options || []) {
        if (!selectedOptionIds.includes(option.id)) {
          continue;
        }

        for (const disabledField of option.disables || []) {
          disabled[disabledField] = true;
        }

        if (option.togglesCategory) {
          visibleCategories[option.togglesCategory] = true;
        }
      }
    }
  }

  return { disabled, visibleCategories };
}

export function sanitizeFormValues(schemaBundle, formValues, disabled) {
  const nextValues = { ...formValues };

  for (const category of schemaBundle.categories) {
    for (const field of category.definition.fields) {
      if (disabled[field.id]) {
        nextValues[field.id] = field.type === 'multi-select' ? [] : null;
      }
    }
  }

  return nextValues;
}

export function getPromptFragments(schemaBundle, model, formValues, visibleCategories) {
  const fragments = [];

  for (const categoryId of model.ordering) {
    const category = schemaBundle.categories.find((item) => item.id === categoryId);

    if (!category || !visibleCategories[categoryId]) {
      continue;
    }

    for (const field of category.definition.fields) {
      const value = formValues[field.id];

      if (value == null || (Array.isArray(value) && value.length === 0)) {
        continue;
      }

      const optionIds = Array.isArray(value) ? value : [value];

      for (const optionId of optionIds) {
        const option = field.options.find((item) => item.id === optionId);
        if (!option) {
          continue;
        }

        const promptValue = model.supportsWeighting && option.promptWeight
          ? `(${option.promptValue}:${option.promptWeight})`
          : option.promptValue;

        fragments.push({
          categoryId,
          fieldId: field.id,
          label: PROMPT_BLOCK_LABELS[categoryId] || category.label,
          text: promptValue,
          placeholder: !!option.placeholder
        });
      }

      if (field.type === 'multi-select' && field.synergy) {
        const synergy = field.synergy[String(optionIds.length)];
        if (synergy) {
          fragments.push({
            categoryId,
            fieldId: field.id,
            label: PROMPT_BLOCK_LABELS[categoryId] || category.label,
            text: synergy.promptValue,
            placeholder: false
          });
        }
      }
    }
  }

  return fragments;
}

export function buildPromptPackage(schemaBundle, models, selectedModelId, formValues, visibleCategories) {
  const model = models[selectedModelId];
  const fragments = getPromptFragments(schemaBundle, model, formValues, visibleCategories);
  const promptParts = [...model.qualityPrefix, ...fragments.map((fragment) => fragment.text)];
  const negativePrompt = model.supportsNegativePrompt
    ? model.negativeBase.join(', ')
    : 'Use in-prompt exclusions only for this model.';

  const placeholders = fragments.filter((fragment) => fragment.placeholder).map((fragment) => fragment.text);

  return {
    prompt: promptParts.join(', '),
    negativePrompt,
    advice: model.supportsNegativePrompt
      ? 'Use the recommended negative prompt and keep location-lighting-camera aligned.'
      : 'This model responds better to compact prompts; avoid adding a separate negative prompt.',
    recommendedSettings: model.recommendedSettings,
    blocks: fragments,
    placeholders
  };
}

export function randomizeForm(schemaBundle, fieldIndex, currentValues, locks, disabled) {
  const nextValues = { ...currentValues };

  for (const category of schemaBundle.categories) {
    for (const field of category.definition.fields) {
      if (locks[field.id] || disabled[field.id]) {
        continue;
      }

      const options = field.options || [];
      if (!options.length) {
        continue;
      }

      if (field.type === 'multi-select') {
        const count = Math.min(field.maxSelections || 1, options.length);
        const size = Math.max(1, Math.floor(Math.random() * count) + 1);
        nextValues[field.id] = shuffle(options).slice(0, size).map((option) => option.id);
      } else {
        nextValues[field.id] = options[Math.floor(Math.random() * options.length)].id;
      }
    }
  }

  const evaluation = evaluateState(schemaBundle, nextValues);
  return {
    values: sanitizeFormValues(schemaBundle, nextValues, evaluation.disabled),
    evaluation
  };
}

function shuffle(items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}
