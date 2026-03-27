# Codebase Concerns

**Analysis Date:** 2026-03-28

## Tech Debt

**Monolithic client state store:**
- Issue: `src/store/useAppStore.js` centralizes initialization, schema resolution, persistence, gallery CRUD, preset CRUD, import/export, clipboard access, and transient UI messaging in one 400-line Zustand store.
- Files: `src/store/useAppStore.js`, `src/App.jsx`
- Impact: Feature work and bug fixes require editing a single highly-coupled module; persistence and UI behavior are easy to break together.
- Fix approach: Split the store into focused slices or service modules for schema loading, prompt generation, persistence, and gallery/preset actions.

**Hard-coded content registry:**
- Issue: Supported models are manually listed in `loadModels()` instead of being discovered from `public/models/`, and category ordering relies on static ids across schema files.
- Files: `src/lib/schema.js`, `public/models/chroma1-hd.json`, `public/models/z-image-turbo.json`, `public/models/lustify-v7.json`, `public/models/lustify-sdxl.json`, `public/schema/index.json`
- Impact: Adding or renaming content requires multi-file coordination and can silently desync runtime data from bundled assets.
- Fix approach: Add a manifest for models, validate ids against schema at startup, and fail with targeted errors when expected assets are missing.

**Placeholder content shipped as live options:**
- Issue: Placeholder taxonomy is present in user-facing schema and seeded presets.
- Files: `README.md`, `public/schema/categories/identity.json`, `public/schema/categories/face.json`, `public/schema/categories/eyes.json`, `public/schema/categories/body.json`, `public/schema/categories/makeup.json`, `public/schema/categories/lingerie.json`, `public/schema/categories/location.json`, `public/schema/categories/lighting.json`, `public/schema/categories/camera.json`, `public/presets/system-presets.json`
- Impact: Generated prompts and presets can contain temporary values, which reduces product quality and makes downstream prompt behavior less predictable.
- Fix approach: Move placeholders behind a development flag or replace them before release-quality preset/content updates.

## Known Bugs

**Invalid model ids can break prompt generation:**
- Symptoms: An unknown `selectedModelId` reaches `buildPromptPackage()`, which dereferences `model.ordering`, `model.negativeBase`, and `model.recommendedSettings` without guards.
- Files: `src/store/useAppStore.js`, `src/lib/engines.js`
- Trigger: Corrupted `localStorage` settings, invalid imported presets, or any future model id mismatch.
- Workaround: Clear browser storage or import only known presets; add model id validation before calling `buildPromptPackage()`.

**Preset import accepts malformed data too broadly:**
- Symptoms: Imported JSON only needs a `formValues` object and non-`system` type to be persisted; unsupported field ids and invalid option ids are not rejected before storage.
- Files: `src/components/PromptPanel.jsx`, `src/store/useAppStore.js`, `src/lib/engines.js`
- Trigger: Importing arbitrary JSON through the `Import Presets` action in `src/components/PromptPanel.jsx`.
- Workaround: None in-app; sanitize imported presets against `buildFieldIndex()` and known model ids before saving.

## Security Considerations

**No schema validation for imported files:**
- Risk: Client-provided JSON is parsed and persisted with minimal checks, which makes the app vulnerable to malformed payloads that trigger runtime exceptions or persistent bad state.
- Files: `src/components/PromptPanel.jsx`, `src/store/useAppStore.js`, `src/lib/storage.js`
- Current mitigation: Invalid JSON falls back to `onImportPresets([])` in `src/components/PromptPanel.jsx`.
- Recommendations: Validate imported presets against a strict schema, reject unknown model ids and field ids, and surface explicit error messages before persisting.

**Persistence writes are not protected:**
- Risk: `localStorage.setItem()` and Dexie mutations are called without `try/catch`, so quota errors or storage failures can break interactive flows.
- Files: `src/lib/storage.js`, `src/store/useAppStore.js`
- Current mitigation: Read paths catch JSON parse failures in `src/lib/storage.js`, but write paths do not catch exceptions.
- Recommendations: Wrap write operations in guarded helpers, surface recoverable errors, and add fallback behavior when browser storage is unavailable.

## Performance Bottlenecks

**Full-state recomputation on every field change:**
- Problem: Each update rebuilds disabled state, visibility, notices, missing-required lists, and prompt blocks across the full schema.
- Files: `src/store/useAppStore.js`, `src/lib/engines.js`
- Cause: `updateField()`, `randomize()`, `loadPreset()`, `loadGalleryEntry()`, and `resetCurrentLook()` all call `resolveState()` and `buildPromptPackage()`, while `resolveState()` may loop up to four times and uses `JSON.stringify()` for change detection.
- Improvement path: Cache field metadata, replace `JSON.stringify()` comparisons with targeted dirty checks, and isolate recomputation to affected fields/categories.

**PWA asset caching can serve stale schema/model JSON:**
- Problem: The service worker caches `json` assets, while the app loads schema, model, and preset data from static JSON files at runtime.
- Files: `vite.config.js`, `src/main.jsx`, `src/lib/schema.js`, `public/schema/index.json`, `public/presets/system-presets.json`, `public/models/chroma1-hd.json`
- Cause: `VitePWA` is enabled with `workbox.globPatterns: ['**/*.{js,css,html,png,svg,json}']` and `registerSW({ immediate: true })`, but there is no app-level data version handling.
- Improvement path: Version runtime JSON payloads, invalidate cached manifests on release, and add a visible refresh/update path when schema assets change.

## Fragile Areas

**Schema-driven prompt engine depends on cross-file id consistency:**
- Files: `src/lib/engines.js`, `src/lib/schema.js`, `public/schema/index.json`, `public/schema/categories/*.json`, `public/models/*.json`, `public/presets/system-presets.json`
- Why fragile: The app depends on shared string ids across manifests, categories, models, presets, suggestions, incompatibilities, and toggled categories. A typo in any JSON file changes runtime behavior immediately.
- Safe modification: Update ids through a single validation pass, extend tests for schema-model-preset integrity, and treat JSON content changes as code changes.
- Test coverage: `tests/engine.test.js` validates some preset/schema integrity, but it does not cover every category rule, every suggestion chain, or imported user content.

**Deployment is coupled to a single base path:**
- Files: `vite.config.js`, `src/lib/schema.js`
- Why fragile: The app hard-codes `base: '/vixenlabs_cx/'` and fetches runtime assets via `import.meta.env.BASE_URL`, so previews or alternative hosting paths require config coordination.
- Safe modification: Keep the deployment base centralized in build-time config and verify asset loading in every deployment target.
- Test coverage: No automated deployment-path test is present.

## Scaling Limits

**Browser-only storage limits long-term content growth:**
- Current capacity: Presets live in `localStorage` and gallery entries live in IndexedDB via Dexie.
- Limit: Browser quota, private browsing restrictions, and device-local storage loss become bottlenecks as gallery payloads or exported state grow.
- Scaling path: Move persistent data to a versioned backend or sync layer before storing large generated images or multi-device user libraries.

## Dependencies at Risk

**`vite-plugin-pwa` adds operational complexity without cache controls:**
- Risk: Service-worker caching increases release coordination risk for schema-heavy JSON assets.
- Impact: Users can run older schema/model content after deployment, causing mismatched prompts or stale presets.
- Migration plan: Keep PWA support only if offline behavior is required; otherwise narrow cache scope or remove runtime JSON from the precache list.

## Missing Critical Features

**No real image generation pipeline:**
- Problem: The primary generate action only stores a placeholder gallery entry with `imageUrl: null` and `isPlaceholder: true`.
- Blocks: End-to-end prompt-to-image workflows, gallery verification against actual outputs, and any production usage beyond prompt drafting.
- Files: `README.md`, `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`, `src/store/useAppStore.js`

**No release gate for tests or linting:**
- Problem: The repository exposes `npm run test` in `package.json`, but the GitHub Pages workflow only installs and builds; no lint config or lint script is present.
- Blocks: Preventing regressions before deploy and enforcing consistent code quality as the schema and store logic expand.
- Files: `package.json`, `.github/workflows/deploy.yml`

## Test Coverage Gaps

**Store persistence and import/export flows are untested:**
- What's not tested: `savePreset()`, `loadPreset()`, `importUserPresets()`, `exportCurrentLook()`, `exportUserPresets()`, gallery CRUD, and storage failure handling.
- Files: `src/store/useAppStore.js`, `src/lib/storage.js`, `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`
- Risk: Corrupted browser state, broken imports, and failed persistence can ship unnoticed.
- Priority: High

**UI behavior and deployment behavior are untested:**
- What's not tested: Swipe navigation, lock interactions, disabled-field behavior in the rendered UI, placeholder warnings, service worker updates, and GitHub Pages base-path loading.
- Files: `src/App.jsx`, `src/components/FieldRenderer.jsx`, `src/components/CategoryRail.jsx`, `src/main.jsx`, `vite.config.js`
- Risk: User-facing regressions can pass local development and still fail after deployment.
- Priority: Medium

**Schema edge cases have limited rule coverage:**
- What's not tested: Multi-step incompatibility cascades, placeholder option handling, toggled `futa-attributes` visibility, and every `suggests` / `disables` relationship across category JSON files.
- Files: `tests/engine.test.js`, `public/schema/categories/*.json`, `src/lib/engines.js`
- Risk: Content-only edits can introduce prompt or visibility bugs without touching JavaScript code.
- Priority: High

---

*Concerns audit: 2026-03-28*
