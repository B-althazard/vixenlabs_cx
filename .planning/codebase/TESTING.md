# Testing Patterns

**Analysis Date:** 2026-03-28

## Test Framework

**Runner:**
- Vitest 2.x via `vitest run` in `package.json`.
- Config: No dedicated `vitest.config.*` file is detected; default Vitest behavior is used.

**Assertion Library:**
- Vitest built-in assertions via `expect`; see `tests/engine.test.js`.

**Run Commands:**
```bash
npm test              # Run all tests once
npx vitest            # Ad hoc watch mode; no script is defined
npx vitest --coverage # Coverage run; no script or thresholds are defined
```

## Test File Organization

**Location:**
- Use the top-level `tests/` directory for automated tests. Current coverage lives in `tests/engine.test.js`.
- Tests are separate from source files, not co-located beside modules under `src/`.

**Naming:**
- Use `*.test.js`; example: `tests/engine.test.js`.

**Structure:**
```
tests/
└── engine.test.js    # Engine logic, schema loading, and preset integrity checks
```

## Test Structure

**Suite Organization:**
```typescript
describe('engine resolution', () => {
  it('clears conflicting camera and pose combinations', () => {
    const schemaBundle = loadSchemaBundle();
    const resolved = resolveState(schemaBundle, {
      ...createDefaultFormValues(schemaBundle),
      stance: 'standing',
      cameraAngle: 'top-down',
      shotType: 'full-body'
    });

    expect(resolved.values.cameraAngle).not.toBe('top-down');
    expect(resolved.evaluation.notices.some((notice) => notice.type === 'reset')).toBe(true);
  });
});
```

**Patterns:**
- Group tests by behavior area with `describe()` blocks; see `engine resolution` and `system presets` in `tests/engine.test.js`.
- Build realistic fixtures from repository JSON assets rather than stubbing them; see `readJson()` and `loadSchemaBundle()` in `tests/engine.test.js`.
- Assert both output values and integrity constraints; examples: conflict cleanup assertions on lines 37-38 and preset validation loop on lines 93-105 in `tests/engine.test.js`.
- Prefer direct expectations over heavy setup abstractions. Helper functions stay small and live in the test file.

## Mocking

**Framework:**
- None currently used.

**Patterns:**
```typescript
// No vi.mock(), spies, or module replacement patterns are present.
// tests/engine.test.js exercises real utility functions and real JSON assets.
```

**What to Mock:**
- Mock browser-only APIs only when new tests target UI or storage code under `src/components/` or `src/store/useAppStore.js`.
- Keep pure logic in `src/lib/engines.js` and `src/lib/schema.js` unmocked when possible.

**What NOT to Mock:**
- Do not mock schema manifests, model JSON, or preset JSON for integrity tests. Current tests intentionally validate real files in `public/schema/`, `public/models/`, and `public/presets/`.

## Fixtures and Factories

**Test Data:**
```typescript
function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function loadSchemaBundle() {
  const manifest = readJson('public/schema/index.json');
  return {
    ...manifest,
    categories: manifest.categories.map((category) => ({
      ...category,
      definition: readJson(path.join('public', category.file.replace(/^\//, '')))
    }))
  };
}
```

**Location:**
- Helpers live inline in `tests/engine.test.js`.
- Fixtures are pulled from committed JSON under `public/schema/`, `public/models/`, and `public/presets/`.

## Coverage

**Requirements:** None enforced.

**View Coverage:**
```bash
npx vitest --coverage
```

- No coverage config, thresholds, or reports are committed.
- Current automated coverage is narrow: one file, four tests, focused on pure engine logic and preset validity.

## Test Types

**Unit Tests:**
- Present for deterministic business logic in `src/lib/engines.js` and `src/lib/schema.js` through `tests/engine.test.js`.
- The current unit style validates pure transformations and data integrity using real JSON input.

**Integration Tests:**
- Lightweight data integration tests are present where schema, presets, and models are validated together in `tests/engine.test.js`.
- No API, storage, or UI integration tests are detected.

**E2E Tests:**
- Not used. No Playwright, Cypress, or browser-driven E2E suite is detected.

## Common Patterns

**Async Testing:**
```typescript
// No async Vitest cases are currently present.
// Existing tests stay synchronous by reading files with readFileSync() and
// calling pure functions from `src/lib/engines.js` and `src/lib/schema.js`.
```

**Error Testing:**
```typescript
// No explicit error-path tests are present.
// Add expect(() => fn()).toThrow(...) for sync failures or
// await expect(promise).rejects.toThrow(...) for async loaders.
```

## Quality Signals and Gaps

- `npm test` currently passes: `tests/engine.test.js` reports 4 passing tests.
- Tests protect important prompt-engine invariants and preset/schema consistency, which is a strong fit for `src/lib/engines.js` and repository JSON assets.
- No automated tests cover React rendering in `src/App.jsx` or `src/components/*.jsx`.
- No tests cover persistence behavior in `src/lib/storage.js` or side-effect-heavy actions in `src/store/useAppStore.js`.
- `.github/workflows/deploy.yml` does not run the test suite, so broken tests would not block deployment unless run manually.

---

*Testing analysis: 2026-03-28*
