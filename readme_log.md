# Vixen Labs CX Handover Log

## Project Context

- Repo: `vixenlabs_cx`
- App type: local-first React/Vite prompt-builder for structured AI character creation
- Deployment target: GitHub Pages at `/vixenlabs_cx/`
- Current product direction: preset-driven app with no live API integration in MVP

## High-Level Product Decisions Locked In

- Split schema by category instead of one large `formSchema.json`
- Required categories:
  - `identity`
  - `face`
  - `eyes`
  - `hair`
  - `body`
  - `makeup`
  - `lingerie`
  - `posing`
  - `location`
  - `lighting`
  - `camera`
  - `futa-attributes`
- Clothing scope for MVP is `lingerie` only
- App ships with 9 built-in female presets
- Built-in presets can be loaded and modified, but not overwritten
- Users can create unlimited custom presets
- API/bridge work was deferred; app is currently local-first and preset-driven

## Stack Chosen

- React 18
- Vite
- Tailwind CSS
- Zustand for app state
- Dexie/IndexedDB for gallery storage
- localStorage for settings and custom presets
- Vite PWA plugin for installable shell
- Vitest for regression tests

## Files and Structure Added

### App scaffold

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `src/main.jsx`
- `src/index.css`
- `public/icons/icon.svg`
- `.gitignore`

### Core app files

- `src/App.jsx`
- `src/store/useAppStore.js`
- `src/lib/schema.js`
- `src/lib/engines.js`
- `src/lib/storage.js`
- `src/components/CategoryRail.jsx`
- `src/components/FieldRenderer.jsx`
- `src/components/PromptPanel.jsx`
- `src/components/GalleryPanel.jsx`

### Schema and model data

- `public/schema/index.json`
- `public/schema/categories/*.json`
- `public/models/chroma1-hd.json`
- `public/models/z-image-turbo.json`
- `public/models/lustify-v7.json`
- `public/models/lustify-sdxl.json`

### Presets and tests

- `public/presets/system-presets.json`
- `tests/engine.test.js`

### Workflow file prepared but not pushed successfully

- `.github/workflows/deploy.yml`

## What Was Implemented

### 1. Split schema system

- Created category-based JSON schema files under `public/schema/categories/`
- Added schema manifest in `public/schema/index.json`
- Each category file contains fields, options, labels, prompt values, and rule metadata

### 2. Prompt engine and form engine

- `src/lib/schema.js`
  - loads schema manifest and category files
  - loads model configs
  - loads built-in system presets
- `src/lib/engines.js`
  - resolves visibility and disable rules
  - applies conflict handling via `incompatibleWith`
  - applies auto-reset when invalid combinations happen
  - assembles prompt fragments in model-specific order
  - supports weighted prompt tokens when model allows them
  - tracks placeholder usage
  - tracks missing required fields
  - randomizes unlocked fields and re-resolves state

### 3. App state and persistence

- `src/store/useAppStore.js`
  - app boot loads schema, models, system presets, user presets, gallery, and persisted settings
  - persists working state: model, locks, current form values, active category
  - supports:
    - field updates
    - locking
    - category changes
    - model changes
    - randomization
    - reset current look
    - copy prompt
    - export current look
    - export custom presets
    - import custom presets
    - save custom preset
    - delete custom preset
    - generate placeholder gallery entry
    - load gallery entry
    - delete gallery entry

### 4. UI

- `src/App.jsx`
  - mobile-first layout
  - swipeable category navigation
  - prompt panel on the right / below
  - presets and gallery section
- `src/components/FieldRenderer.jsx`
  - renders field options and lock state
- `src/components/PromptPanel.jsx`
  - model selection
  - prompt output
  - negative prompt/settings display
  - notices display
  - validation state
  - actions: randomize, generate, save, copy, reset, export, import
- `src/components/GalleryPanel.jsx`
  - fixed-order preset cards
  - system/custom badges
  - custom preset deletion
  - gallery load/delete actions

### 5. Built-in system presets

- Added 9 system presets in `public/presets/system-presets.json`
- All are female presets
- Fixed-order list:
  1. `Lyndie` - ginger
  2. `Vivienne` - bimbo
  3. `Sarah` - Arabian Nights-inspired
  4. `Simone` - tall girl
  5. `Dorien` - fat++ girl
  6. `Noa`
  7. `Marisol`
  8. `Celeste`
  9. `Roxanne`
- System presets are shipped with the app and never stored in localStorage
- Custom presets are stored separately and appended after system presets

### 6. Rule system

- Added `suggests` metadata to support guidance between categories
- Added `incompatibleWith` metadata to support automatic reset of conflicting combinations
- Example rule domains implemented:
  - lingerie vs stockings/materials
  - pose vs shot type/camera angle
  - location vs lighting/backdrop
  - lighting vs shadow mood
  - camera vs pose

### 7. Tests

- Added `vitest`
- Added `tests/engine.test.js`
- Current coverage includes:
  - conflict resolution behavior
  - lock-respecting randomization
  - system preset count/order
  - validation that system presets only use known schema option ids and model ids

## Deployment and Pages Work

### What was fixed

- `vite.config.js`
  - set `base: '/vixenlabs_cx/'`
  - changed PWA `start_url` to `/vixenlabs_cx/`
- `src/lib/schema.js`
  - changed fetch behavior to use `import.meta.env.BASE_URL`
  - this fixed runtime 404s for:
    - schema JSON
    - model JSON
    - preset JSON

### Important deployment issue

- A GitHub Actions workflow file was created at `.github/workflows/deploy.yml`
- Push of that workflow failed because the auth token in use did not have `workflow` scope
- GitHub rejected workflow updates with a PAT scope error
- Result:
  - Pages path fixes were pushed successfully
  - workflow file remains local/untracked unless pushed manually with proper credentials

## Commits Made

- `967b7ec` - `Add initial Vixen Labs app scaffold`
- `7f2274b` - `Build preset-driven creator workflow`
- `893cb6a` - `Fix GitHub Pages asset paths`
- `45b4308` - `Fix Pages data asset loading`

## Current Functional State

- App builds successfully with `npm run build`
- Tests pass with `npm test`
- App is intended to function as a local-first preset/prompt builder with:
  - category-driven prompt creation
  - randomization
  - validation
  - built-in presets
  - custom presets
  - placeholder gallery entries
  - JSON import/export

## Remaining Known Gaps

### 1. Placeholder schema values still exist

These were intentionally left in place until product-approved vocabulary is finalized:

- `placeholder-mixed`
- `placeholder-refined`
- `placeholder-soft-smoke`
- `placeholder-sunflush`
- `placeholder-bold`
- `placeholder-filmic`
- `placeholder-cinematic-35`
- `placeholder-fine-line`

These placeholders appear both in schema files and some shipped presets.

### 2. No real generation backend

- `Generate Placeholder` stores a gallery snapshot only
- There is no real image generation call
- This is by product choice after replacing the API path with preset-first UX

### 3. Workflow push incomplete

- `.github/workflows/deploy.yml` exists locally but was not pushed due to auth scope limitation
- If someone with proper GitHub permissions pushes it, Pages deployment can be automated

### 4. Minor browser-console noise

Known non-blocking items seen during testing:

- missing `favicon.ico`
- font/CSS warnings from browser parsing
- occasional layout warning during stylesheet load

These are not primary blockers.

## Important Runtime Bug That Was Found and Fixed

### Symptom

- GitHub Pages loaded the app shell but runtime JSON fetches failed with 404s from root URLs such as:
  - `/schema/index.json`
  - `/models/*.json`
  - `/presets/system-presets.json`

### Cause

- Vite app base path was set for Pages, but the app's runtime `fetch()` calls still used absolute root paths

### Fix

- `src/lib/schema.js` now prefixes all runtime data fetches with `import.meta.env.BASE_URL`

## Exact Areas Another Developer Should Inspect First

- `src/store/useAppStore.js`
- `src/lib/engines.js`
- `src/lib/schema.js`
- `public/presets/system-presets.json`
- `public/schema/categories/`
- `vite.config.js`
- `.github/workflows/deploy.yml`

## Recommended Next Steps

1. Push `.github/workflows/deploy.yml` using credentials with `workflow` scope
2. Replace placeholder schema values with final approved vocabulary
3. Add a favicon and minor polish items
4. Add tests for import/export, persistence restore, and gallery interactions
5. If live generation is ever reintroduced, isolate it behind a new adapter rather than coupling it into current UI/store logic

## Useful Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## Final Note

The app was moved from a research/spec state into a working local-first web app. The biggest unresolved issues are content finalization and deployment automation permissions, not base architecture.
