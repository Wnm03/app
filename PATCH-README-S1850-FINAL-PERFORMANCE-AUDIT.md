# S1850 — FINAL PERFORMANCE + MEMORY + REGRESSION AUDIT

Cumulative on top of S1846–S1849.

## Scope audited
- IndexedDB/localStorage persistence frequency and duplicate serialization.
- Mobile lifecycle flush (`visibilitychange`, `freeze`, `pagehide`, `beforeunload`).
- Repeated event-listener installation guards in the inspected hot modules.
- Large rollback snapshots and other remaining serialization hotspots were reviewed; no unsafe broad rollback rewrite was applied because those snapshots protect multi-domain mutations and changing them without an undo contract could alter rollback semantics.
- Startup timers and deferred work were reviewed; existing deferral/guards are retained.

## S1850 fix
`modules/shared/features-helpers-global-security.js`

Added a mutation-versioned persistence snapshot cache:
- `save()` advances `_saveStateVersion`.
- `_getSaveSnapshotForVersion()` serializes `D` at most once per save version and reuses the exact JSON for subsequent critical flushes.
- `_saveQueuedVersion` prevents the same snapshot from being queued to IndexedDB repeatedly when mobile lifecycle events fire back-to-back.
- `saveFlush()` still writes the synchronous localStorage safety snapshot, preserving the existing durability contract.
- No schema, feature behavior, UI, or data model changes.

## Regression
`tests/s1850-persistence-memory-audit.test.js`: 6/6 pass.

Syntax check:
- `modules/shared/features-helpers-global-security.js`: PASS

S1841–S1849 files/tests are retained unchanged except for the cumulative S1850 persistence additions.
