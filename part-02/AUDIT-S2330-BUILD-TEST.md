# S2330 Build/Test Audit — 2026-10-02

## Root causes repaired
- `SCHEMA_VERSION` was on a line beginning with `//`, so the declaration was commented out; isolated startup/migration tests threw `ReferenceError: SCHEMA_VERSION is not defined`.
- Service-worker `activate` deleted every origin cache except the current app cache. It now removes only stale `kw-cache-*` caches, preserving unrelated caches owned by other apps on the same origin.
- Two test contracts were stale relative to the intended behavior: the persistence test expected a literal `return false` instead of `_blockSaveFlushOnRecovery()`, and the older PWA test expected unrelated caches to be deleted. Tests/gates now match the hardened contracts.

## Results
- Build version: `s2041-1-part-sot-hardening-2217`.
- Full suite: 8233 tests; 8232 pass; 0 fail; 1 skipped.
- `verify-bundle-freshness.js`: PASS (both bundles fresh).
- `verify-version-integrity.js`: PASS (`2217` / `kw-cache-v2217`).
- `verify-delete-manifest.js`: PASS (`pro-ui-layer.css` absent).
- `verify-pwa-recovery.js`: PASS.
- `verify-release-ready.js`: PASS with documented overrides for missing ESLint and esbuild only.

## Limitations
- Bundle files are syntactically valid and fresh but unminified because esbuild is unavailable in this environment.
- ESLint could not run because ESLint is unavailable. The release gate records both overrides; a release requiring zero overrides must install the tools and rerun the gate.
