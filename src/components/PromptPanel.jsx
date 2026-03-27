export default function PromptPanel({ models, selectedModelId, onSelectModel, promptPackage, onRandomize, onGenerate, onSavePreset }) {
  const modelList = Object.values(models);

  return (
    <aside className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Prompt Output</div>
          <h2 className="font-display text-2xl">Generation Pack</h2>
        </div>
        <button type="button" onClick={onRandomize} className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-white">
          Randomize
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modelList.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelectModel(model.id)}
            className={`chip ${model.id === selectedModelId ? 'chip-active' : 'chip-idle'}`}
          >
            {model.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] bg-stone-950 p-4 text-stone-100">
        <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Positive Prompt</div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{promptPackage?.prompt || 'Loading prompt...'}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] bg-white p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Negative</div>
          <p className="mt-2 text-sm text-stone-700">{promptPackage?.negativePrompt}</p>
        </div>
        <div className="rounded-[24px] bg-white p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Settings</div>
          <p className="mt-2 text-sm text-stone-700">
            Steps {promptPackage?.recommendedSettings?.steps} / CFG {promptPackage?.recommendedSettings?.cfg_scale}
          </p>
          <p className="text-sm text-stone-700">Sampler {promptPackage?.recommendedSettings?.sampler}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] bg-amber-50 p-4 text-sm text-stone-700">
        <div className="font-medium">Advice</div>
        <p className="mt-1">{promptPackage?.advice}</p>
        {!!promptPackage?.placeholders?.length && (
          <p className="mt-2 text-amber-800">Placeholder values in use: {promptPackage.placeholders.join(', ')}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onGenerate} className="rounded-full bg-ember px-5 py-3 font-medium text-white">
          Generate Placeholder
        </button>
        <button type="button" onClick={onSavePreset} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Save Preset
        </button>
      </div>
    </aside>
  );
}
