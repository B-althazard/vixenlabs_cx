export default function PromptPanel({
  models,
  selectedModelId,
  onSelectModel,
  promptPackage,
  notices,
  runtimeUpdateAvailable,
  runtimeUpdateMessage,
  copyStatus,
  actionStatus,
  isValid,
  missingRequired,
  onRandomize,
  onGenerate,
  onSavePreset,
  onRefreshRuntime,
  onCopyPrompt,
  onResetLook,
  onExportLook,
  onExportPresets,
  onImportPresets
}) {
  const modelList = Object.values(models);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imported = JSON.parse(await file.text());
      onImportPresets(imported);
    } catch {
      onImportPresets([]);
    }

    event.target.value = '';
  };

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
          <p className="mt-2 text-sm text-stone-700">Blocks {promptPackage?.blockCount}</p>
        </div>
      </div>

      <div className={`mt-4 rounded-[24px] p-4 text-sm ${isValid ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
        <div className="font-medium">{isValid ? 'Ready to build' : 'Missing required fields'}</div>
        {!isValid && !!missingRequired?.length && (
          <p className="mt-1">{missingRequired.map((field) => field.label).join(', ')}</p>
        )}
      </div>

      <div className="mt-4 rounded-[24px] bg-amber-50 p-4 text-sm text-stone-700">
        <div className="font-medium">Advice</div>
        <p className="mt-1">{promptPackage?.advice}</p>
        {!!promptPackage?.placeholders?.length && (
          <p className="mt-2 text-amber-800">Placeholder values in use: {promptPackage.placeholders.join(', ')}</p>
        )}
        {!!notices?.length && (
          <div className="mt-3 space-y-1 text-amber-900">
            {notices.slice(0, 5).map((notice, index) => (
              <p key={`${notice.source}-${index}`}>
                <span className="font-medium uppercase tracking-[0.18em]">{notice.type}</span> {notice.source} - {notice.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {runtimeUpdateAvailable && (
        <div className="mt-4 rounded-[24px] bg-sky-50 p-4 text-sm text-sky-950">
          <div className="font-medium">New release ready</div>
          <p className="mt-1">{runtimeUpdateMessage}</p>
          <button
            type="button"
            onClick={onRefreshRuntime}
            className="mt-3 rounded-full bg-sky-600 px-4 py-2 font-medium text-white"
          >
            Refresh App
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onGenerate} disabled={!isValid} className="rounded-full bg-ember px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
          Generate Placeholder
        </button>
        <button type="button" onClick={onSavePreset} disabled={!isValid} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50">
          Save As New Preset
        </button>
        <button type="button" onClick={onCopyPrompt} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Copy Prompt
        </button>
        <button type="button" onClick={onResetLook} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Reset Look
        </button>
        <button type="button" onClick={onExportLook} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Export Look
        </button>
        <button type="button" onClick={onExportPresets} className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Export Presets
        </button>
        <label className="rounded-full border border-stone-300 px-5 py-3 font-medium text-ink">
          Import Presets
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {copyStatus && <div className="mt-3 text-sm text-moss">{copyStatus}</div>}
      {actionStatus && <div className="mt-2 text-sm text-ember">{actionStatus}</div>}
    </aside>
  );
}
