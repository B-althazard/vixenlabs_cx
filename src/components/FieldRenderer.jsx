function OptionButton({ active, children, onClick, placeholder }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-ember bg-ember text-white' : 'border-stone-200 bg-white'} ${placeholder ? 'ring-1 ring-amber-300' : ''}`}
    >
      {children}
    </button>
  );
}

export default function FieldRenderer({ field, value, disabled, locked, onUpdate, onToggleLock }) {
  const values = Array.isArray(value) ? value : [value];

  const handleSelect = (optionId) => {
    if (disabled) {
      return;
    }

    if (field.type === 'multi-select') {
      const current = Array.isArray(value) ? value : [];
      const exists = current.includes(optionId);
      if (exists) {
        onUpdate(field.id, current.filter((item) => item !== optionId));
        return;
      }

      const next = [...current, optionId].slice(0, field.maxSelections || 99);
      onUpdate(field.id, next);
      return;
    }

    onUpdate(field.id, optionId);
  };

  return (
    <section className={`rounded-[24px] border border-stone-200 bg-cream/80 p-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg text-ink">{field.label}</div>
          <div className="text-sm text-stone-500">{field.type.replace('-', ' ')}</div>
        </div>
        <button type="button" onClick={() => onToggleLock(field.id)} className={`chip ${locked ? 'chip-active' : 'chip-idle'}`}>
          {locked ? 'Locked' : 'Lock'}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {field.options.map((option) => (
          <OptionButton
            key={option.id}
            active={values.includes(option.id)}
            placeholder={option.placeholder}
            onClick={() => handleSelect(option.id)}
          >
            <div className="font-medium">{option.label}</div>
            <div className={`text-sm ${values.includes(option.id) ? 'text-white/80' : 'text-stone-500'}`}>
              {option.promptValue}
            </div>
          </OptionButton>
        ))}
      </div>
    </section>
  );
}
