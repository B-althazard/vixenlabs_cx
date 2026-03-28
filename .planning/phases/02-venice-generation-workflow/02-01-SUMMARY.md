---
phase: 02-venice-generation-workflow
plan: 01
subsystem: api
tags: [venice, payload, models, vitest, react]
requires:
  - phase: 01-trusted-schema-runtime-boundaries
    provides: trusted schema and model assets for payload derivation
provides:
  - config-driven Venice generation metadata for all shipped models
  - exact generation payload builder shared by prompt output consumers
  - regression coverage for supported and unsupported payload fields
affects: [venice-bridge, prompt-panel, store, generation-ui]
tech-stack:
  added: []
  patterns: [config-driven generation capabilities, shared payload derivation from resolved prompt fragments]
key-files:
  created: [tests/generationPayload.test.js]
  modified: [public/models/chroma1-hd.json, public/models/z-image-turbo.json, public/models/lustify-v7.json, public/models/lustify-sdxl.json, src/lib/engines.js]
key-decisions:
  - "Store provider capability flags inside each model JSON under generation.supports so UI and payload logic read the same source of truth."
  - "Expose generationPayload and generationSupport from buildPromptPackage so downstream UI can render exact outbound request fields without JSX literals."
patterns-established:
  - "Model metadata owns Venice control support and defaults."
  - "Prompt output and generation payload both derive from shared prompt fragments instead of duplicated literals."
requirements-completed: [GEN-03, GEN-04]
duration: 4 min
completed: 2026-03-28
---

# Phase 2 Plan 1: Venice payload contracts Summary

**Config-driven Venice payload metadata and shared prompt-package generation contracts for all shipped image models.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T11:56:57Z
- **Completed:** 2026-03-28T12:01:12Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added a `generation` capability contract to all shipped model configs.
- Introduced `buildGenerationPayload()` as the exact outbound Venice payload source of truth.
- Exposed payload and support metadata through `buildPromptPackage()` and locked behavior with Vitest coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add config-driven Venice generation capabilities to every shipped model** - `0cae20f` (test), `5d4b25b` (feat)
2. **Task 2: Derive an exact generation payload from resolved schema + model state** - `725e0ad` (test), `ea2ee45` (feat)

**Plan metadata:** Pending

_Note: TDD tasks produced RED and GREEN commits._

## Files Created/Modified
- `tests/generationPayload.test.js` - Covers model capability metadata, unsupported field omission, and prompt-package payload exposure.
- `public/models/chroma1-hd.json` - Adds Venice generation provider/support/default metadata.
- `public/models/z-image-turbo.json` - Adds Venice generation metadata with `negativePrompt` disabled.
- `public/models/lustify-v7.json` - Adds Venice generation provider/support/default metadata.
- `public/models/lustify-sdxl.json` - Adds Venice generation provider/support/default metadata.
- `src/lib/engines.js` - Builds exact generation payloads and exposes payload metadata through prompt packages.

## Decisions Made
- Kept generation control support in model JSON so provider/model capability checks stay out of JSX.
- Reused resolved prompt fragments for both display and bridge payloads to avoid divergent prompt assembly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the initial payload builder during Task 1**
- **Found during:** Task 1 (Add config-driven Venice generation capabilities to every shipped model)
- **Issue:** Task 1 verification exercised `buildGenerationPayload()` before Task 2's planned integration work, so model-only changes could not make the RED test pass.
- **Fix:** Added a minimal config-driven `buildGenerationPayload()` export alongside the model metadata, then refined prompt-package integration in Task 2.
- **Files modified:** `src/lib/engines.js`
- **Verification:** `npx vitest run tests/generationPayload.test.js`
- **Committed in:** `5d4b25b`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor sequencing adjustment only; kept the plan outcome intact and enabled the TDD cycle to complete cleanly.

## Issues Encountered
- Task 1 verification depended on payload-builder behavior earlier than the task file list implied; resolved inline by landing the minimum shared helper before Task 2 refinement.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `02-02-PLAN.md` to add the Venice bridge adapter and lifecycle normalization on top of the shared payload contract.
- No known blockers from this plan.

## Self-Check: PASSED

---
*Phase: 02-venice-generation-workflow*
*Completed: 2026-03-28*
