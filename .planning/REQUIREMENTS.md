# Requirements: Vixen Labs CX

**Defined:** 2026-03-28
**Core Value:** Users can rapidly create high-quality, conflict-safe character prompts and generation flows without writing prompts manually.

## v1 Requirements

Requirements for the current roadmap. These focus on turning the existing brownfield scaffold into a trustworthy creator workflow.

### Schema and Validation

- [x] **SCHEMA-01**: User can create characters only through curated selections that map to prompt-ready values, with no free-text authoring required in the app
- [x] **SCHEMA-02**: User can use complete, product-approved core categories with final labels, prompt values, conflict rules, and visual assets instead of placeholder-only content
- [x] **SCHEMA-03**: User can safely load the app even when saved presets, gallery records, model ids, or imported files contain invalid data
- [x] **SCHEMA-04**: User can continue working after schema or model updates because incompatible stored data is migrated, reset, or clearly quarantined instead of silently breaking the session

### Generation

- [ ] **GEN-01**: User can submit the current character configuration to a Venice-backed generation flow and start an image job from the app
- [ ] **GEN-02**: User can see generation state for each job, including queued, running, succeeded, failed, and retryable outcomes
- [ ] **GEN-03**: User can configure only supported generation controls for the active provider or model, including model choice and any supported size, seed, variants, style, and negative prompt options
- [ ] **GEN-04**: User can trust that the prompt output panel shows exactly the resolved payload used for generation, without hard-coded extra properties
- [ ] **GEN-05**: User can retry or recover a generation job without accidentally attaching the wrong result to the wrong character snapshot

### Gallery and Presets

- [ ] **GAL-01**: User can save every successful generation as a real gallery item with image data and its originating metadata
- [ ] **GAL-02**: User can reopen any gallery item and restore the full builder state used to create it
- [ ] **GAL-03**: User can save a preset with a name and thumbnail derived from the latest relevant generated image
- [ ] **GAL-04**: User can import and export presets with validation, clear error feedback, and no corruption of existing saved data
- [ ] **GAL-05**: User can keep gallery items and presets across sessions through browser-local persistence designed for real images, not placeholder records

### Mobile Experience

- [ ] **MOBILE-01**: User can navigate the builder with mobile-first swipe gestures across categories and major creation views
- [ ] **MOBILE-02**: User can reach primary actions such as generate, save preset, copy prompt, and restore image state comfortably on a phone-sized screen
- [ ] **MOBILE-03**: User can still use the full creator workflow on desktop without losing access to the mobile-first interaction model

### Runtime Reliability

- [ ] **RUNTIME-01**: User can receive schema, model, and preset updates without the service worker serving stale runtime JSON indefinitely
- [ ] **RUNTIME-02**: User can recover from storage or browser-automation failures with a clear status message instead of a broken or ambiguous session

## v2 Requirements

Deferred until the core generation loop is stable.

### Creator Iteration

- **ITER-01**: User can generate variations that keep locked identity fields stable while exploring other traits
- **ITER-02**: User can branch a new creation from any gallery item and see lineage between original and remixed outputs
- **ITER-03**: User can receive model-aware generation advice about style usage and expected output quality

### Extended Creation System

- **EXT-01**: User can start from curated creator starter presets authored by the product team
- **EXT-02**: User can use future reference-image or LoRA-ready consistency features without losing compatibility with saved presets and gallery records
- **EXT-03**: User can use a direct API-backed generation path once secret-managed infrastructure is approved

## Out of Scope

Explicitly excluded from this roadmap.

| Feature | Reason |
|---------|--------|
| Male character support | The product scope is intentionally limited to female and futanari creator workflows |
| Monetization, subscriptions, or payments | Explicitly excluded from the initial build and not required for the current creator workflow |
| User accounts, cloud sync, or social sharing platform features | Static local-first architecture should stay focused on the core creation loop first |
| Generic free-text prompt editor | Conflicts with the curated structured-input product thesis |
| Full raw provider parameter surface | Would add mobile clutter and weaken the opinionated creator experience |

## Traceability

Which phases cover which requirements. This is updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 1 | Complete |
| SCHEMA-02 | Phase 1 | Complete |
| SCHEMA-03 | Phase 1 | Complete |
| SCHEMA-04 | Phase 1 | Complete |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-05 | Phase 2 | Pending |
| GAL-01 | Phase 3 | Pending |
| GAL-02 | Phase 3 | Pending |
| GAL-03 | Phase 3 | Pending |
| GAL-04 | Phase 3 | Pending |
| GAL-05 | Phase 3 | Pending |
| MOBILE-01 | Phase 4 | Pending |
| MOBILE-02 | Phase 4 | Pending |
| MOBILE-03 | Phase 4 | Pending |
| RUNTIME-01 | Phase 1 | Pending |
| RUNTIME-02 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
