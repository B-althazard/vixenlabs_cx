---
status: partial
phase: 02-venice-generation-workflow
source: [02-VERIFICATION.md]
started: 2026-03-28T12:22:42Z
updated: 2026-03-28T12:22:42Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real bridge readiness and recovery
expected: With the userscript installed and Venice signed in, the bridge unavailable warning clears; without it, the app shows the recovery guidance from the prompt panel.
result: [pending]

### 2. End-to-end Venice job lifecycle
expected: A real generation moves from queued to running to succeeded, and the returned image preview appears in the matching gallery snapshot.
result: [pending]

### 3. Retry after visibility or bridge failure
expected: After a visibility or stale-bridge failure, retry creates a new attempt and any later old result does not replace the new snapshot's image.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
