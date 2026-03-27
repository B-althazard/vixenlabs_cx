export default function GalleryPanel({ gallery, presets, onLoadPreset }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Presets</h2>
          <span className="text-sm text-stone-500">{presets.length} saved</span>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {presets.length === 0 && <div className="text-sm text-stone-500">No presets yet.</div>}
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLoadPreset(preset.id)}
              className="min-w-[180px] rounded-[24px] bg-gradient-to-br from-clay to-ember p-4 text-left text-white"
            >
              <div className="text-xs uppercase tracking-[0.24em] text-white/70">{preset.thumbnailLabel}</div>
              <div className="mt-4 font-display text-xl">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Gallery</h2>
          <span className="text-sm text-stone-500">{gallery.length} items</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {gallery.length === 0 && <div className="col-span-2 text-sm text-stone-500">Generated entries land here.</div>}
          {gallery.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-[24px] border border-stone-200 bg-white">
              <div className="aspect-[3/4] bg-gradient-to-br from-stone-900 via-ember to-clay p-4 text-white">
                <div className="text-xs uppercase tracking-[0.24em] text-white/70">Placeholder</div>
                <div className="mt-3 font-display text-xl">{entry.title}</div>
                <div className="mt-6 text-sm text-white/80">{entry.promptPackage?.blocks?.slice(0, 3).map((block) => block.text).join(', ')}</div>
              </div>
              <div className="p-3 text-xs text-stone-500">{new Date(entry.createdAt).toLocaleString()}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
