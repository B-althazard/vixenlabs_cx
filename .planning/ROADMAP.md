# Roadmap: Vixen Labs CX

## Overview

This roadmap turns the existing React/Vite creator from a promising local-first prototype into a trustworthy production-ready workflow by first hardening schema and runtime safety, then adding reliable Venice-backed generation, then making generated outputs reusable through durable gallery/preset flows, and finally polishing the full mobile-first creator journey.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Trusted Schema & Runtime Boundaries** - Make approved content, validation, migrations, and runtime freshness safe enough for production use.
- [ ] **Phase 2: Venice Generation Workflow** - Deliver a trustworthy Venice-backed job flow with accurate controls, payloads, and recovery states.
- [ ] **Phase 3: Real Gallery & Preset Persistence** - Turn generated outputs into durable reusable gallery items and presets across sessions.
- [ ] **Phase 4: Mobile-First Creator Flow** - Finish the phone-first interaction model without breaking the desktop workflow.

## Phase Details

### Phase 1: Trusted Schema & Runtime Boundaries
**Goal**: Users can create with approved schema content and keep using the app safely even when cached assets or stored local data are invalid or outdated.
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, RUNTIME-01
**Success Criteria** (what must be TRUE):
  1. User can create characters only from curated, prompt-ready selections with product-approved labels, values, rules, and visual assets.
  2. User can open the app and continue working even when saved presets, gallery records, model ids, or imported data are invalid, instead of landing in a broken session.
  3. User can continue after schema or model updates because incompatible stored data is migrated, reset, or clearly quarantined.
  4. User receives fresh schema, model, and preset data after releases without the service worker trapping the app on stale runtime JSON indefinitely.
**Plans**: 3 plans
Plans:
- [ ] 01-trusted-schema-runtime-boundaries/01-01-PLAN.md — Validate schema/model/preset assets and remove Phase 1 placeholder content.
- [ ] 01-trusted-schema-runtime-boundaries/01-02-PLAN.md — Sanitize, migrate, and quarantine invalid persisted state safely.
- [ ] 01-trusted-schema-runtime-boundaries/01-03-PLAN.md — Fix PWA/runtime freshness for schema, model, and preset updates.
**UI hint**: yes

### Phase 2: Venice Generation Workflow
**Goal**: Users can start, monitor, and recover Venice-backed image generation jobs with trustworthy controls and payload visibility.
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, RUNTIME-02
**Success Criteria** (what must be TRUE):
  1. User can submit the current character configuration from the app and start a Venice-backed generation job.
  2. User can see each job move through queued, running, succeeded, failed, and retryable states, with clear status when browser automation fails.
  3. User can configure only controls supported by the active provider or model, and the prompt output panel matches the exact resolved payload used for generation.
  4. User can retry or recover a generation without attaching the wrong image result to the wrong character snapshot.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Real Gallery & Preset Persistence
**Goal**: Users can keep, restore, and safely move real generated outputs and presets through browser-local persistence built for images and metadata.
**Depends on**: Phase 2
**Requirements**: GAL-01, GAL-02, GAL-03, GAL-04, GAL-05
**Success Criteria** (what must be TRUE):
  1. Every successful generation appears as a real gallery item with saved image data and its originating metadata.
  2. User can reopen any gallery item and restore the full builder state used to create it.
  3. User can save a preset with a name and a thumbnail derived from the latest relevant generated image.
  4. User can import and export presets with validation and clear error feedback without corrupting existing saved data.
  5. User keeps gallery items and presets across sessions through browser-local persistence designed for real images rather than placeholders.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Mobile-First Creator Flow
**Goal**: Users can complete the full creator workflow comfortably on phone-sized screens while retaining desktop usability.
**Depends on**: Phase 3
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. User can move through builder categories and major creator views with swipe gestures on mobile.
  2. User can comfortably reach primary actions such as generate, save preset, copy prompt, and restore image state on a phone-sized screen.
  3. User can still complete the full creator workflow on desktop without losing access to the mobile-first interaction model.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Trusted Schema & Runtime Boundaries | 3/3 | Complete | 2026-03-28 |
| 2. Venice Generation Workflow | 0/TBD | Not started | - |
| 3. Real Gallery & Preset Persistence | 0/TBD | Not started | - |
| 4. Mobile-First Creator Flow | 0/TBD | Not started | - |
