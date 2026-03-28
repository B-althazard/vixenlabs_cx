# Vixen Labs CX

## What This Is

Vixen Labs CX is a mobile-first AI character creation app for content creators who want to build female and futanari characters through a structured, schema-driven interface instead of free-text prompting. The current brownfield codebase already delivers the core character builder, prompt assembly flow, presets, and browser-local gallery scaffolding, and the next project scope extends that foundation toward a production-ready Venice.ai-backed creation workflow.

## Core Value

Users can rapidly create high-quality, conflict-safe character prompts and generation flows without writing prompts manually.

## Requirements

### Validated

- ✓ Users can configure female and futanari character traits through a schema-driven multi-category form - existing
- ✓ Users can generate model-specific prompt packages from structured form selections - existing
- ✓ Users can randomize unlocked fields while preserving conflict-aware form validity - existing
- ✓ Users can save, reload, import, and export presets in browser-local storage - existing
- ✓ Users can browse placeholder gallery entries and restore prior looks from local persistence - existing
- ✓ Users can build from approved schema and preset content without shipped placeholder taxonomy - validated in Phase 1
- ✓ Users can recover from invalid saved settings, presets, gallery rows, and imports without breaking the session - validated in Phase 1
- ✓ Users can receive fresh runtime schema/model/preset data through the new service-worker refresh path - validated in Phase 1

### Active

- [ ] Complete the mobile-first interaction model, including mandatory swipe gestures and stronger production UX polish
- [ ] Integrate Venice.ai generation through a robust testing bridge based on the provided UserScript workflow
- [ ] Remove hard-coded prompt output properties and ensure prompt panels render only resolved model output
- [ ] Persist real generated images and metadata instead of placeholder-only gallery entries

### Out of Scope

- Male character support - the product is intentionally limited to female and futanari creators in this version
- Monetization, subscriptions, or payments - explicitly excluded from the initial build in the architecture spec
- Backend accounts or cloud sync in the current scope - the deployed app remains static and browser-local for now
- General free-text prompt authoring - the product premise is curated selection only, not manual prompt writing

## Context

- The repository is already a working React/Vite SPA with Zustand state, Dexie-backed IndexedDB, Tailwind styling, Vitest tests, and GitHub Pages deployment.
- The provided architecture spec in `data/VixenLabs_ArchSpec_v1.md` defines the intended product direction: a structured, uncensored AI character creator for content creators, with Phase 1 focused on core engine quality and later phases covering automation and direct API generation.
- Phase 1 completed the trusted runtime boundary work: shipped schema/preset assets are placeholder-free, runtime loaders validate assets before use, persisted browser-local data is sanitized on recovery, and runtime JSON freshness now has a visible refresh path.
- The supporting notes in `data/README-for-Agent.md` add critical delivery constraints: mobile-first design, mandatory swipe gestures, generated assets, avoidance of hard-coded prompt output properties, and a strong service worker approach.
- The reference `data/UserScript.md` shows a Venice.ai bridge pattern that can inform the Phase 2A testing workflow and eventual app integration strategy.

## Constraints

- **Product scope**: Female and futanari characters only - this is the core audience and content boundary from the product spec.
- **Input model**: No free-text fields in the application - every selection must map to curated prompt-ready values.
- **Hosting**: Static deployment on GitHub Pages - the app must work without a backend in the current phase.
- **UX**: Mobile-first with mandatory swipe gestures - desktop support matters, but mobile interaction quality comes first.
- **Storage**: Browser-local persistence for current scope - presets and gallery data stay local until a later production architecture changes that.
- **Integration**: Venice.ai is the intended image provider - near-term automation should align with the provided bridge script and avoid committing secrets.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve the existing React + Vite + Zustand brownfield foundation | The current app already implements the structured builder and prompt engine patterns the product depends on | - Pending |
| Keep the app schema-driven and selection-only | The product's differentiation depends on curated prompt-safe inputs rather than freeform prompting | ✓ Good |
| Treat Venice.ai as the near-term generation target | The supplied bridge script and notes explicitly point to Venice.ai as the provider for testing and follow-on integration | - Pending |
| Keep planning docs local for this initialization pass | The chosen workflow config sets `commit_docs` to `false` | - Pending |
| Validate runtime assets and sanitize persisted state before Venice integration | Generation work depends on trusted schema ids, safe local recovery flows, and fresh runtime JSON after releases | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 1 completion*
