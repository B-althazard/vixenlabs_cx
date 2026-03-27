# Architecture

**Analysis Date:** 2026-03-28

## Pattern Overview

**Overall:** Client-side React single-page application with a centralized Zustand store, schema-driven UI rendering, and browser-local persistence.

**Key Characteristics:**
- `src/main.jsx` mounts a single React root and registers the PWA service worker.
- `src/App.jsx` composes the full UI from store-backed presentational panels instead of route-based pages.
- `src/store/useAppStore.js` acts as the orchestration layer for loading assets, resolving state rules, building prompts, and persisting user data.

## Layers

**Bootstrap Layer:**
- Purpose: Start the application shell and global styling.
- Location: `src/main.jsx`, `index.html`, `src/index.css`
- Contains: React root creation, service worker registration, Tailwind entry CSS, and the root DOM node.
- Depends on: React, `virtual:pwa-register`, Vite asset handling.
- Used by: Browser entry at `index.html`.

**Composition Layer:**
- Purpose: Assemble the visible app layout and bind UI controls to store state/actions.
- Location: `src/App.jsx`
- Contains: Header, category rail, active category form area, prompt panel, gallery panel, and swipe navigation logic.
- Depends on: `src/store/useAppStore.js`, `src/components/CategoryRail.jsx`, `src/components/FieldRenderer.jsx`, `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`.
- Used by: `src/main.jsx`.

**Presentation Layer:**
- Purpose: Render reusable UI sections without owning application state.
- Location: `src/components/CategoryRail.jsx`, `src/components/FieldRenderer.jsx`, `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`
- Contains: Category navigation, schema field controls, prompt/export actions, preset cards, and gallery cards.
- Depends on: Props passed from `src/App.jsx`.
- Used by: `src/App.jsx`.

**State and Orchestration Layer:**
- Purpose: Hold canonical client state and expose all user actions.
- Location: `src/store/useAppStore.js`
- Contains: Initialization, field updates, model selection, randomization, preset CRUD, gallery CRUD, clipboard/export/import actions, and persistence helpers.
- Depends on: `src/lib/schema.js`, `src/lib/engines.js`, `src/lib/storage.js`, Dexie, Zustand.
- Used by: `src/App.jsx`.

**Domain Logic Layer:**
- Purpose: Interpret schema definitions and derive resolved prompt-building state.
- Location: `src/lib/engines.js`, `src/lib/schema.js`
- Contains: Schema loading, field flattening, default state creation, rule evaluation, sanitization, prompt fragment generation, and randomization.
- Depends on: JSON assets under `public/schema/`, `public/models/`, and `public/presets/`.
- Used by: `src/store/useAppStore.js`, `tests/engine.test.js`.

**Persistence Layer:**
- Purpose: Persist browser-local user state and generated gallery items.
- Location: `src/lib/storage.js`, Dexie setup inside `src/store/useAppStore.js`
- Contains: `localStorage` access for settings and user presets plus IndexedDB-backed gallery storage.
- Depends on: Browser storage APIs and Dexie.
- Used by: `src/store/useAppStore.js`.

**Static Data Layer:**
- Purpose: Define schema categories, model configs, and system presets as versioned JSON assets.
- Location: `public/schema/index.json`, `public/schema/categories/*.json`, `public/models/*.json`, `public/presets/system-presets.json`
- Contains: Category manifests, field definitions, option rules, model ordering/settings, and curated presets.
- Depends on: Vite static file serving.
- Used by: `src/lib/schema.js` at runtime and `tests/engine.test.js` in tests.

## Data Flow

**App initialization:**

1. `src/main.jsx` renders `src/App.jsx` and registers the service worker.
2. `src/App.jsx` calls `initialize()` from `src/store/useAppStore.js` in `useEffect`.
3. `initialize()` loads schema, models, and system presets via `src/lib/schema.js`, then restores settings from `src/lib/storage.js` and gallery items from Dexie.
4. `resolveState()` in `src/lib/engines.js` derives `disabled`, `visibleCategories`, `notices`, and validation state.
5. `buildPromptPackage()` in `src/lib/engines.js` assembles the positive prompt, negative prompt, advice, and block metadata for the selected model.
6. Store state is committed and read back by `src/App.jsx` and its child components.

**Interactive update cycle:**

1. `src/components/FieldRenderer.jsx`, `src/components/CategoryRail.jsx`, `src/components/PromptPanel.jsx`, and `src/components/GalleryPanel.jsx` emit callbacks from user actions.
2. `src/App.jsx` forwards those callbacks to actions in `src/store/useAppStore.js`.
3. Store actions recompute resolved state with `resolveState()` or `randomizeForm()` from `src/lib/engines.js`.
4. The store rebuilds the prompt package with `buildPromptPackage()` and persists the working state through `src/lib/storage.js` when appropriate.
5. React re-renders the panels from updated store state.

**Preset and gallery flow:**

1. `savePreset()` in `src/store/useAppStore.js` snapshots `formValues` into user presets and stores them in `localStorage` via `saveUserPresets()`.
2. `captureGeneration()` stores a placeholder gallery entry in IndexedDB through Dexie and reloads the gallery list sorted by `createdAt`.
3. `loadPreset()` and `loadGalleryEntry()` rehydrate form state, rerun resolution, rebuild the prompt package, and persist the restored working state.

**State Management:**
- Use a single Zustand store in `src/store/useAppStore.js` as the source of truth.
- Keep derived state (`disabled`, `visibleCategories`, `promptPackage`, `missingRequired`) in the store so components stay stateless.
- Persist long-lived user state in `localStorage` and gallery history in IndexedDB.

## Key Abstractions

**Schema Bundle:**
- Purpose: Represent the full category/field graph loaded from split JSON files.
- Examples: `public/schema/index.json`, `public/schema/categories/identity.json`, `public/schema/categories/camera.json`
- Pattern: Manifest-plus-definition loading in `loadSchemaBundle()` inside `src/lib/schema.js`.

**Resolved Form State:**
- Purpose: Normalize raw selections into a valid UI state with disabled fields, visible categories, notices, and required-field tracking.
- Examples: `evaluateState()`, `sanitizeFormValues()`, `resolveState()` in `src/lib/engines.js`
- Pattern: Multi-pass rule evaluation and sanitization loop.

**Prompt Package:**
- Purpose: Convert the resolved schema state into model-specific generation output.
- Examples: `buildPromptPackage()` and `getPromptFragments()` in `src/lib/engines.js`; rendering in `src/components/PromptPanel.jsx`
- Pattern: Ordered fragment assembly driven by `public/models/*.json` ordering and capability flags.

**Preset and Gallery Records:**
- Purpose: Capture reusable looks and placeholder generation history.
- Examples: `savePreset()`, `loadPreset()`, `captureGeneration()`, `loadGalleryEntry()` in `src/store/useAppStore.js`
- Pattern: Browser-local record snapshots with separate storage backends for presets and gallery entries.

## Entry Points

**Browser app entry:**
- Location: `src/main.jsx`
- Triggers: Browser loading `index.html`.
- Responsibilities: Register the PWA worker, import global CSS, and render the app root.

**Application shell:**
- Location: `src/App.jsx`
- Triggers: React render lifecycle.
- Responsibilities: Initialize the store, choose the active category, and coordinate the three main UI regions.

**Deployment build:**
- Location: `.github/workflows/deploy.yml`
- Triggers: Push to `main` or manual workflow dispatch.
- Responsibilities: Run `npm ci`, `npm run build`, upload `dist/`, and deploy to GitHub Pages.

## Error Handling

**Strategy:** Fail fast during initialization, recover silently for browser persistence/parsing issues, and expose user-facing fallback text in the shell.

**Patterns:**
- `src/lib/schema.js` throws when a fetch for schema/model/preset JSON fails.
- `initialize()` in `src/store/useAppStore.js` catches startup failures and stores `error` for `src/App.jsx` to render.
- `src/lib/storage.js` wraps `localStorage` parsing in `try/catch` and falls back to empty objects or arrays.
- `copyPrompt()` and preset import handling in `src/store/useAppStore.js` and `src/components/PromptPanel.jsx` degrade to status messages instead of throwing.

## Cross-Cutting Concerns

**Logging:** Not detected in runtime code under `src/`.

**Validation:** Schema-driven validation and conflict handling live in `src/lib/engines.js`; required fields and incompatible selections are surfaced as notices and `missingRequired` items.

**Authentication:** Not applicable; no server-side auth boundary is present in `src/`, `public/`, or `.github/workflows/deploy.yml`.

---

*Architecture analysis: 2026-03-28*
