# S1776 — Persistence lifecycle single-owner hardening

## Finding
S1763 made application bootstrap lifecycle installation idempotent, but persistence already had its own guarded lifecycle owner in `features-helpers-global-security.js`. Keeping both created two independent `visibilitychange`/`pagehide` flush paths. This could trigger duplicate `saveFlush()` work during mobile background/navigation events.

## Fix
- Removed the duplicate global lifecycle listener installer from `modules/shared/app-init-runtime.js`.
- Kept runtime maintenance interval idempotency in the bootstrap runtime.
- Extended the canonical persistence lifecycle owner with `freeze` handling.
- Updated S1763 regression to assert the new single-owner architecture.
- Added `tests/persistence-lifecycle-single-owner-s1776.test.js`.
- Re-synchronized inventory documentation.
- Rebuilt release to version 1764.

## Verification
- 25/25 targeted regression tests PASS.
- Bundle freshness PASS (A/B source hashes match).
- Window expose 82/82 PASS.
- Car Notes performance PASS.
- Car Notes integrity PASS (344 scanned, forbidden 0, duplicate IDs 0/0, ServisDeclarations 1).
- Build PASS; both bundles syntax-valid.
- esbuild remains unavailable in the sandbox, so generated bundles are valid but not minified.
- The broader gate command timed out while reaching the final service integrity step; no failure was reported by the completed preceding gates.
