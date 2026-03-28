---
phase: 01-trusted-schema-runtime-boundaries
plan: 03
subsystem: ui
tags: [pwa, vite, service-worker, runtime-cache, vitest]
requires:
  - phase: 01-trusted-schema-runtime-boundaries
    provides: validated runtime schema and persisted-state safety from earlier phase work
provides:
  - freshness-aware runtime JSON fetch URLs for schema, model, and preset assets
  - PWA precache rules that keep the app shell offline-safe without trapping runtime JSON
  - a visible service-worker refresh path backed by runtime freshness regression tests
affects: [runtime-data, pwa, schema-loading, release-safety]
tech-stack:
  added: []
  patterns: [build-versioned runtime fetch URLs, store-driven service-worker refresh notices]
key-files:
  created: [src/lib/runtimeFreshness.js, tests/runtimeFreshness.test.js]
  modified: [vite.config.js, src/lib/schema.js, src/main.jsx, src/store/useAppStore.js, src/App.jsx, src/components/PromptPanel.jsx]
key-decisions:
  - "Removed runtime JSON from the Workbox precache so release-time schema, model, and preset changes are fetched fresh instead of pinned inside the app shell cache."
  - "Used a build-version query string helper for runtime asset requests so GitHub Pages deployments can bust stale caches without server-side headers."
  - "Routed service-worker update readiness through Zustand state and the existing prompt panel so users get an explicit refresh action instead of a silent stale shell."
patterns-established:
  - "Runtime assets use createVersionedRuntimeUrl() before fetch()."
  - "Service-worker update events enter the UI through store state, not console logging."
requirements-completed: [RUNTIME-01]
duration: 6 min
completed: 2026-03-28
---

# Phase 1 Plan 3: Runtime freshness summary

**Build-versioned runtime asset fetching, a JSON-safe PWA precache, and a visible service-worker refresh path for fresh schema releases.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T00:06:04Z
- **Completed:** 2026-03-28T00:12:27Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Removed runtime JSON from Workbox precache while keeping the app shell cached for offline safety.
- Added a reusable runtime freshness helper that appends `?v=` build versions to schema, model, and preset fetch URLs.
- Exposed service-worker update readiness in the UI with a refresh button and regression coverage for both freshness helpers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reconfigure PWA caching to keep runtime JSON fresh** - `a847da4` (feat)
2. **Task 2: Surface runtime update recovery and lock freshness behavior with tests** - `4d4a01e` (test), `aaf7fb2` (feat)

**Plan metadata:** pending

_Note: Task 2 used TDD with separate RED and GREEN commits._

## Files Created/Modified
- `vite.config.js` - stops precaching runtime JSON and defines the build version for client freshness logic.
- `src/lib/schema.js` - fetches runtime JSON through the versioned request helper.
- `src/lib/runtimeFreshness.js` - centralizes build-version URL generation and service-worker refresh notice state.
- `src/main.jsx` - registers a service-worker refresh callback that notifies the store when a release is ready.
- `src/store/useAppStore.js` - stores refresh readiness and exposes the reload action.
- `src/App.jsx` - threads runtime refresh state into the prompt panel.
- `src/components/PromptPanel.jsx` - renders the visible refresh notice and recovery button.
- `tests/runtimeFreshness.test.js` - covers versioned runtime URLs and refresh notice helper behavior.

## Decisions Made
- Removed runtime JSON from precache instead of relying on cache headers because GitHub Pages hosting cannot guarantee backend cache-control behavior.
- Used a shared helper for versioned request URLs and refresh notice state so schema loading and update UX stay aligned.
- Kept the refresh path inside existing store/UI state to match repository guidance against console logging.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2 followed a RED/GREEN flow: the new runtime freshness test initially failed because the refresh notice helper did not exist yet, then passed after the helper and UI/store wiring landed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 runtime freshness work is complete and ready for roadmap progress updates.
- Later schema, model, and preset releases now have a clear refresh path instead of silent stale runtime data.

## Self-Check: PASSED

- FOUND: `.planning/phases/01-trusted-schema-runtime-boundaries/01-03-SUMMARY.md`
- FOUND: `a847da4`
- FOUND: `4d4a01e`
- FOUND: `aaf7fb2`

---
*Phase: 01-trusted-schema-runtime-boundaries*
*Completed: 2026-03-28*
