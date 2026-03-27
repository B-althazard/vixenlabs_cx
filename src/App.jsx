import { useEffect, useMemo, useRef } from 'react';
import CategoryRail from './components/CategoryRail';
import FieldRenderer from './components/FieldRenderer';
import GalleryPanel from './components/GalleryPanel';
import PromptPanel from './components/PromptPanel';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const {
    schemaBundle,
    formValues,
    locks,
    disabled,
    visibleCategories,
    promptPackage,
    models,
    selectedModelId,
    presets,
    gallery,
    activeCategoryId,
    loading,
    error,
    initialize,
    updateField,
    toggleLock,
    setActiveCategoryId,
    setModel,
    randomize,
    captureGeneration,
    savePreset,
    loadPreset
  } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const visibleCategoriesList = useMemo(() => {
    if (!schemaBundle) {
      return [];
    }

    return schemaBundle.categories.filter((category) => visibleCategories[category.id]);
  }, [schemaBundle, visibleCategories]);

  const activeCategory = visibleCategoriesList.find((category) => category.id === activeCategoryId) || visibleCategoriesList[0];
  const touchStartRef = useRef(null);

  const handleTouchStart = (event) => {
    touchStartRef.current = event.changedTouches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartRef.current == null || !activeCategory) {
      return;
    }
    const delta = event.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(delta) < 40) {
      return;
    }

    const index = visibleCategoriesList.findIndex((category) => category.id === activeCategory.id);
    const nextIndex = delta < 0 ? index + 1 : index - 1;
    const nextCategory = visibleCategoriesList[nextIndex];
    if (nextCategory) {
      setActiveCategoryId(nextCategory.id);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center font-display text-2xl">Loading Vixen Labs...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-700">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 panel overflow-hidden px-5 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-stone-500">Vixen Labs</div>
            <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
              Structured character design for deliberate prompt building.
            </h1>
          </div>
          <div className="max-w-md text-sm leading-6 text-stone-600">
            Swipe categories on mobile, lock details you want to preserve, and build model-specific prompt packages from split schema data.
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <CategoryRail categories={visibleCategoriesList} activeCategoryId={activeCategory?.id} onSelect={setActiveCategoryId} />

          <div className="panel p-4 sm:p-5" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-stone-500">Active Category</div>
                <h2 className="font-display text-3xl">{activeCategory?.label}</h2>
              </div>
              <div className="text-sm text-stone-500">Swipe left or right</div>
            </div>

            <div className="grid gap-4">
              {activeCategory?.definition.fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={formValues[field.id]}
                  disabled={disabled[field.id]}
                  locked={locks[field.id]}
                  onUpdate={updateField}
                  onToggleLock={toggleLock}
                />
              ))}
            </div>
          </div>
        </div>

        <PromptPanel
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={setModel}
          promptPackage={promptPackage}
          onRandomize={randomize}
          onGenerate={captureGeneration}
          onSavePreset={savePreset}
        />
      </div>

      <div className="mt-5">
        <GalleryPanel gallery={gallery} presets={presets} onLoadPreset={loadPreset} />
      </div>
    </div>
  );
}
