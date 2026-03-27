# Coding Conventions

**Analysis Date:** 2026-03-28

## Naming Patterns

**Files:**
- Use `PascalCase.jsx` for React components in `src/components/` and `src/App.jsx`; examples: `src/components/FieldRenderer.jsx`, `src/components/PromptPanel.jsx`, `src/App.jsx`.
- Use `camelCase.js` for store and utility modules; examples: `src/store/useAppStore.js`, `src/lib/schema.js`, `src/lib/storage.js`.
- Use `.test.js` for test files in `tests/`; example: `tests/engine.test.js`.

**Functions:**
- Use `camelCase` for functions and store actions; examples: `resolveState()` in `src/lib/engines.js`, `loadSchemaBundle()` in `src/lib/schema.js`, `copyPrompt()` in `src/store/useAppStore.js`.
- Use `use*` naming for Zustand hooks; example: `useAppStore` in `src/store/useAppStore.js`.
- Use `handle*` for component event handlers; examples: `handleTouchStart()` in `src/App.jsx`, `handleImport()` in `src/components/PromptPanel.jsx`, `handleSelect()` in `src/components/FieldRenderer.jsx`.

**Variables:**
- Use descriptive `camelCase` names, including booleans like `isValid`, `loading`, and `disabled` in `src/store/useAppStore.js` and `src/lib/engines.js`.
- Use `UPPER_SNAKE_CASE` for module-level constants; examples: `PROMPT_BLOCK_LABELS` in `src/lib/engines.js`, `USER_PRESETS_KEY` and `SETTINGS_KEY` in `src/lib/storage.js`.

**Types:**
- Not applicable. No TypeScript or runtime schema typing layer is present in `src/`.

## Code Style

**Formatting:**
- No Prettier, Biome, or dedicated formatter config is detected at repo root.
- Follow the repository's existing style from `src/**/*.js` and `src/**/*.jsx`:
  - 2-space indentation
  - semicolons enabled
  - single quotes for strings
  - trailing commas used sparingly; do not introduce them where surrounding code omits them
  - blank lines between logical sections
- Keep long expressions wrapped across lines instead of compressing them; see `buildPromptPackage()` in `src/lib/engines.js` and `initialize()` in `src/store/useAppStore.js`.

**Linting:**
- No ESLint or Biome config is detected, and `package.json` contains no lint script.
- Use code review and test pass status as the current quality gate.

## Import Organization

**Order:**
1. Framework and package imports; examples in `src/main.jsx` (`react`, `react-dom/client`, `virtual:pwa-register`) and `src/store/useAppStore.js` (`dexie`, `zustand`).
2. Internal relative imports from sibling feature areas; examples in `src/App.jsx` and `src/store/useAppStore.js`.
3. CSS side-effect imports last when present; example: `import './index.css';` in `src/main.jsx`.

**Path Aliases:**
- Not detected. Use relative imports such as `./components/CategoryRail` in `src/App.jsx` and `../lib/schema` in `src/store/useAppStore.js`.
- In app source, local imports usually omit file extensions; examples: `src/App.jsx`, `src/store/useAppStore.js`.
- In Node-based tests, local imports include `.js` extensions for ESM compatibility; examples: `../src/lib/schema.js`, `../src/lib/engines.js` in `tests/engine.test.js`.

## Error Handling

**Patterns:**
- Prefer `try`/`catch` around browser APIs and storage access, then fall back to safe defaults; see `loadUserPresets()` and `loadSettings()` in `src/lib/storage.js`, `handleImport()` in `src/components/PromptPanel.jsx`, and `copyPrompt()` in `src/store/useAppStore.js`.
- Throw explicit `Error` objects for failed fetches; see `loadJson()` in `src/lib/schema.js`.
- Use early returns to avoid nested conditionals; examples in `src/App.jsx`, `src/components/FieldRenderer.jsx`, and `src/store/useAppStore.js`.
- Surface async initialization failures into store state instead of logging; see `initialize()` in `src/store/useAppStore.js`.

## Logging

**Framework:** None detected.

**Patterns:**
- Do not introduce `console.*` logging as a default pattern. No application logging calls are present in `src/`.
- Report user-visible status through state fields such as `copyStatus`, `actionStatus`, and `error` in `src/store/useAppStore.js`.

## Comments

**When to Comment:**
- Keep comments minimal. Source files in `src/` contain almost no inline comments.
- Prefer self-describing function and variable names over explanatory comments.

**JSDoc/TSDoc:**
- Not used in `src/` or `tests/`. Match the current style unless a new public API genuinely needs contract documentation.

## Function Design

**Size:**
- Utilities in `src/lib/schema.js` and `src/lib/storage.js` stay small and single-purpose.
- Complex orchestration currently lives in larger functions and store actions, especially `initialize()` and other actions in `src/store/useAppStore.js`. Keep new helpers extracted into `src/lib/` when logic becomes reusable.

**Parameters:**
- Pass explicit primitives and plain objects rather than option bags when the call site is short; examples: `resolveState(schemaBundle, formValues)` in `src/lib/engines.js` and `updateField(fieldId, value)` in `src/store/useAppStore.js`.
- For components, destructure props in the function signature; examples in `src/components/PromptPanel.jsx`, `src/components/GalleryPanel.jsx`, and `src/components/CategoryRail.jsx`.

**Return Values:**
- Utility functions return plain objects with named fields; examples: `evaluateState()` and `buildPromptPackage()` in `src/lib/engines.js`.
- Store actions mutate state through `set()` and persist side effects separately; see `persistWorkingState()` in `src/store/useAppStore.js`.

## Module Design

**Exports:**
- Use default exports for React components; examples: `src/App.jsx`, `src/components/FieldRenderer.jsx`, `src/components/GalleryPanel.jsx`.
- Use named exports for utility modules; examples: `src/lib/schema.js`, `src/lib/engines.js`, `src/lib/storage.js`.
- Export the Zustand hook as a named constant; example: `export const useAppStore` in `src/store/useAppStore.js`.

**Barrel Files:**
- Not used. Import directly from concrete files such as `./components/PromptPanel` and `../lib/storage`.

## Quality Signals and Gaps

- `package.json` defines `npm test` only; no lint, format, typecheck, coverage, or watch scripts are present.
- `.github/workflows/deploy.yml` builds and deploys on push to `main` but does not run `npm test`, so tests are not a deployment gate.
- Conventions are consistent across `src/`, but they are enforced socially rather than by tooling.
- The codebase relies on plain JavaScript, so preserve naming clarity and small helpers to compensate for the lack of static typing.

---

*Convention analysis: 2026-03-28*
