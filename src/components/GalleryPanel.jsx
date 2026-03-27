export default function GalleryPanel({ gallery, presets, onLoadPreset, onDeletePreset, onLoadGallery, onDeleteGallery }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Presets</h2>
          <span className="text-sm text-stone-500">{presets.length} total</span>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {presets.length === 0 && <div className="text-sm text-stone-500">No presets yet.</div>}
          {presets.map((preset) => (
            <article key={preset.id} className="min-w-[220px] rounded-[24px] bg-gradient-to-br from-clay to-ember p-4 text-left text-white">
              <button type="button" onClick={() => onLoadPreset(preset.id)} className="w-full text-left">
                <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.24em] text-white/70">
                  <span>{preset.thumbnailLabel}</span>
                  <span className="rounded-full border border-white/25 px-2 py-1 text-[10px] tracking-[0.18em] text-white/85">
                    {preset.type === 'system' ? 'System' : 'Custom'}
                  </span>
                </div>
                <div className="mt-4 font-display text-xl">{preset.name}</div>
                {preset.description && <div className="mt-2 text-sm text-white/80">{preset.description}</div>}
              </button>
              {preset.type === 'user' && (
                <button
                  type="button"
                  onClick={() => onDeletePreset(preset.id)}
                  className="mt-4 rounded-full border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/90"
                >
                  Delete
                </button>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Gallery</h2>
          <span className="text-sm text-stone-500">{gallery.length} items</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {gallery.length === 0 && <div className="col-span-2 text-sm text-stone-500">Generated entries land here.</div>}
          {gallery.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-[24px] border border-stone-200 bg-white">
              <div className="aspect-[3/4] bg-gradient-to-br from-stone-900 via-ember to-clay p-4 text-white">
                <div className="text-xs uppercase tracking-[0.24em] text-white/70">Placeholder</div>
                <div className="mt-3 font-display text-xl">{entry.title}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-white/70">{entry.selectedModelId}</div>
                <div className="mt-6 text-sm text-white/80">{entry.promptPackage?.blocks?.slice(0, 4).map((block) => block.text).join(', ')}</div>
              </div>
              <div className="space-y-3 p-3 text-xs text-stone-500">
                <div>{new Date(entry.createdAt).toLocaleString()}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onLoadGallery(entry.id)} className="rounded-full border border-stone-300 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-stone-700">
                    Load
                  </button>
                  <button type="button" onClick={() => onDeleteGallery(entry.id)} className="rounded-full border border-stone-300 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-stone-700">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
