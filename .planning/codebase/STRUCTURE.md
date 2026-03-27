# Codebase Structure

**Analysis Date:** 2026-03-28

## Directory Layout

```text
vixenlabs_cx/
├── src/                 # Runtime React application code
│   ├── components/      # Presentational UI panels and field renderers
│   ├── lib/             # Schema loading, prompt engine, and storage helpers
│   └── store/           # Central Zustand store and app actions
├── public/              # Static JSON assets and icons served by Vite
│   ├── models/          # Model capability/order definitions
│   ├── presets/         # System preset seed data
│   └── schema/          # Schema manifest plus category definitions
├── tests/               # Vitest coverage for schema and engine behavior
├── dist/                # Generated production build output
├── .github/workflows/   # GitHub Pages deployment automation
├── data/                # Supporting reference documents and research artifacts
├── index.html           # Vite HTML entry document
├── package.json         # Scripts and package manifest
├── vite.config.js       # Vite and PWA build configuration
├── tailwind.config.js   # Tailwind theme tokens
└── postcss.config.js    # PostCSS plugin wiring
```

## Directory Purposes

**`src/`:**
- Purpose: Hold all shipped client application code.
- Contains: `src/main.jsx`, `src/App.jsx`, `src/components/*.jsx`, `src/lib/*.js`, `src/store/useAppStore.js`.
- Key files: `src/App.jsx`, `src/store/useAppStore.js`, `src/lib/engines.js`, `src/lib/schema.js`.

**`src/components/`:**
- Purpose: Keep UI pieces focused on rendering and event forwarding.
- Contains: `src/components/CategoryRail.jsx`, `src/components/FieldRenderer.jsx`, `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`.
- Key files: `src/components/FieldRenderer.jsx`, `src/components/PromptPanel.jsx`.

**`src/lib/`:**
- Purpose: Store framework-agnostic helper logic and runtime data access.
- Contains: `src/lib/schema.js`, `src/lib/engines.js`, `src/lib/storage.js`.
- Key files: `src/lib/engines.js`, `src/lib/schema.js`.

**`src/store/`:**
- Purpose: Centralize state, effects, and all user actions.
- Contains: `src/store/useAppStore.js`.
- Key files: `src/store/useAppStore.js`.

**`public/`:**
- Purpose: Serve runtime JSON and icons without bundling them into source modules.
- Contains: `public/schema/index.json`, `public/schema/categories/*.json`, `public/models/*.json`, `public/presets/system-presets.json`, `public/icons/icon.svg`.
- Key files: `public/schema/index.json`, `public/models/chroma1-hd.json`, `public/presets/system-presets.json`.

**`tests/`:**
- Purpose: Verify prompt engine and preset/schema integrity with file-backed tests.
- Contains: `tests/engine.test.js`.
- Key files: `tests/engine.test.js`.

**`dist/`:**
- Purpose: Hold generated build artifacts created by `npm run build`.
- Contains: Built HTML, service worker assets, copied JSON assets, and icons.
- Key files: `dist/index.html`, `dist/sw.js`, `dist/schema/index.json`.

**`data/`:**
- Purpose: Keep design/reference material outside the runtime app.
- Contains: `data/VixenLabs_ArchSpec_v1.md`, `data/README-for-Agent.md`, `data/UserScript.md`, and research subfolders.
- Key files: `data/VixenLabs_ArchSpec_v1.md`, `data/README-for-Agent.md`.

## Key File Locations

**Entry Points:**
- `index.html`: Browser document that loads `src/main.jsx`.
- `src/main.jsx`: React bootstrap and service worker registration.
- `src/App.jsx`: Top-level application shell.

**Configuration:**
- `package.json`: NPM scripts and dependency declarations.
- `vite.config.js`: Base path, React plugin, and PWA manifest/workbox setup.
- `tailwind.config.js`: Theme colors, shadows, and fonts.
- `postcss.config.js`: Tailwind and Autoprefixer integration.
- `.github/workflows/deploy.yml`: CI build and GitHub Pages deployment.

**Core Logic:**
- `src/store/useAppStore.js`: Canonical client state and action orchestration.
- `src/lib/engines.js`: Validation, conflict resolution, randomization, and prompt assembly.
- `src/lib/schema.js`: Static asset loading and schema helpers.
- `src/lib/storage.js`: `localStorage` persistence helpers.

**Testing:**
- `tests/engine.test.js`: Engine behavior and preset integrity checks.

## Naming Conventions

**Files:**
- Use PascalCase for React component files: `src/components/PromptPanel.jsx`.
- Use camelCase for utility and store modules: `src/store/useAppStore.js`, `src/lib/schema.js`.
- Use kebab-case for static JSON asset files: `public/models/chroma1-hd.json`, `public/schema/categories/futa-attributes.json`.

**Directories:**
- Use lowercase plural or singular functional folders: `src/components`, `src/lib`, `src/store`, `public/models`, `public/schema/categories`.

## Where to Add New Code

**New Feature:**
- Primary code: extend the store in `src/store/useAppStore.js`, add UI in `src/components/`, and wire it from `src/App.jsx`.
- Tests: add or expand coverage in `tests/engine.test.js`; create additional `tests/*.test.js` files for new engine or store behaviors.

**New Component/Module:**
- Implementation: add presentational components under `src/components/` and keep domain helpers under `src/lib/`.

**Utilities:**
- Shared helpers: place schema/prompt/storage utilities in `src/lib/`.

**Schema or model expansion:**
- Category definitions: `public/schema/categories/*.json`.
- Category manifest updates: `public/schema/index.json`.
- Model configuration: `public/models/*.json`.
- Seed presets: `public/presets/system-presets.json`.

## Special Directories

**`public/schema/`:**
- Purpose: Runtime-editable schema boundary for categories and fields.
- Generated: No.
- Committed: Yes.

**`public/models/`:**
- Purpose: Model prompt capabilities, ordering, and recommended generation settings.
- Generated: No.
- Committed: Yes.

**`public/presets/`:**
- Purpose: Shipped system presets available on first load.
- Generated: No.
- Committed: Yes.

**`dist/`:**
- Purpose: Build output consumed by deployment.
- Generated: Yes.
- Committed: Yes.

**`data/`:**
- Purpose: Non-runtime supporting documentation and external research.
- Generated: No.
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Agent-authored repository mapping documents.
- Generated: Yes.
- Committed: Depends on workflow; files are present for planning support.

---

*Structure analysis: 2026-03-28*
