export default function CategoryRail({ categories, activeCategoryId, onSelect }) {
  return (
    <div className="panel overflow-hidden p-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`min-w-[112px] rounded-2xl px-4 py-3 text-left transition ${
              activeCategoryId === category.id ? 'bg-ember text-white' : 'bg-white text-ink'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.24em] opacity-70">{category.icon}</div>
            <div className="mt-2 font-display text-sm">{category.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
