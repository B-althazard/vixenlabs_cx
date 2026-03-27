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
  const notices = [];
  const invalidSelections = new Set();
  const missingRequired = [];

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
      const rawValue = formValues[field.id];
      const isEmpty = Array.isArray(rawValue) ? rawValue.length === 0 : rawValue == null;

      if (field.required && !disabled[field.id] && isEmpty) {
        missingRequired.push({ fieldId: field.id, label: field.label, categoryId: category.id });
        notices.push({
          type: 'validation',
          source: field.label,
          message: 'This required field needs a selection.'
        });
      }

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

        for (const suggestion of option.suggests || []) {
          notices.push({
            type: 'suggestion',
            source: `${field.label}: ${option.label}`,
            message: buildSuggestionMessage(suggestion)
          });
        }

        for (const conflict of option.incompatibleWith || []) {
          const [targetFieldId, targetOptionId] = conflict.split(':');
          const targetValue = formValues[targetFieldId];
          const targetValues = Array.isArray(targetValue) ? targetValue : [targetValue];

          if (!targetValues.includes(targetOptionId)) {
            continue;
          }

          invalidSelections.add(`${targetFieldId}:${targetOptionId}`);
          notices.push({
            type: 'conflict',
            source: `${field.label}: ${option.label}`,
            message: `Conflicts with ${targetFieldId} -> ${targetOptionId.replaceAll('-', ' ')}.`
          });
        }
      }
    }
  }

  return { disabled, visibleCategories, notices, invalidSelections, missingRequired, isValid: missingRequired.length === 0 };
}

export function sanitizeFormValues(schemaBundle, formValues, disabled, invalidSelections = new Set()) {
  const nextValues = { ...formValues };
  const resetNotices = [];

  for (const category of schemaBundle.categories) {
    for (const field of category.definition.fields) {
      if (disabled[field.id]) {
        nextValues[field.id] = field.type === 'multi-select' ? [] : null;
        resetNotices.push({
          type: 'reset',
          source: field.label,
          message: 'Cleared because this field is disabled by the current selection.'
        });
        continue;
      }

      if (field.type === 'multi-select') {
        const current = Array.isArray(nextValues[field.id]) ? nextValues[field.id] : [];
        const filtered = current.filter((optionId) => !invalidSelections.has(`${field.id}:${optionId}`));
        if (filtered.length !== current.length) {
          nextValues[field.id] = filtered;
          resetNotices.push({
            type: 'reset',
            source: field.label,
            message: 'Removed incompatible selections automatically.'
          });
        }
        continue;
      }

      const current = nextValues[field.id];
      if (current != null && invalidSelections.has(`${field.id}:${current}`)) {
        const fallback = (field.options || []).find((option) => !invalidSelections.has(`${field.id}:${option.id}`));
        nextValues[field.id] = fallback ? fallback.id : null;
        resetNotices.push({
          type: 'reset',
          source: field.label,
          message: `Reset to ${fallback ? fallback.label : 'empty'} because the previous option conflicted.`
        });
      }
    }
  }

  return { values: nextValues, resetNotices };
}

export function resolveState(schemaBundle, formValues) {
  let values = { ...formValues };
  let evaluation = evaluateState(schemaBundle, values);
  let notices = [...evaluation.notices];

  for (let index = 0; index < 4; index += 1) {
    const sanitized = sanitizeFormValues(schemaBundle, values, evaluation.disabled, evaluation.invalidSelections);
    const changed = JSON.stringify(sanitized.values) !== JSON.stringify(values);
    values = sanitized.values;
    notices = [...notices, ...sanitized.resetNotices];

    if (!changed) {
      return {
        values,
        evaluation: { ...evaluation, notices }
      };
    }

    evaluation = evaluateState(schemaBundle, values);
    notices = [...evaluation.notices, ...sanitized.resetNotices];
  }

  return {
    values,
    evaluation: { ...evaluation, notices }
  };
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
    placeholders,
    blockCount: fragments.length
  };
}

export function buildSuggestionMessage(suggestion) {
  const [fieldId, optionId] = suggestion.includes(':') ? suggestion.split(':') : [suggestion, null];
  if (!optionId) {
    return `Consider aligning ${fieldId}.`;
  }
  return `Consider ${fieldId} -> ${optionId.replaceAll('-', ' ')}.`;
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

  const resolved = resolveState(schemaBundle, nextValues);
  return {
    values: resolved.values,
    evaluation: resolved.evaluation
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
