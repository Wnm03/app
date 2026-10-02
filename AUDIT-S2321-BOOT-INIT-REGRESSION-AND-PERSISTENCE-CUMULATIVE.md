# AUDIT S2321 — BOOT `init is not defined` + DATA-PERSISTENCE PROTECTION

## Status
**FIXED / VERIFIED — cumulative S2320 + S2321; S2322 hardening added in separate report**

## User-visible symptom
After refresh/update, the application shows:

> Gagal memulai aplikasi (`init is not defined`)

and the main UI does not open.

## Root cause — confirmed from source + deployed bundle shape

The production build uses `scripts/build.js` as the package build entrypoint. Its `GROUP_B` intentionally keeps the diagnostic `self-test.js` lazy (S2254/S2261). Therefore `self-test.js` is **not present in the eager production bundle**.

However `app-bootstrap.js` still called:

`Promise.resolve(init())`

The `init()` compatibility facade exists inside `self-test.js`, so when the diagnostic harness is lazy, the eager production bundle has no `init` identifier. Browser runtime therefore throws:

`ReferenceError: init is not defined`

This is a deterministic wiring/build-boundary regression, not a browser-storage error.

## Why this is related to the previous data-loss symptom

The previous S2320 audit found a separate persistence safety gap: if durable storage cannot be read, the application must not silently boot into an empty/default state and then permit writes.

S2320 is retained cumulatively in this patch. S2321 fixes the earlier boot failure so the persistence protection can actually run during normal production boot.

These are **two distinct defects**:

1. **S2321:** eager bootstrap called a lazy `init()` symbol -> application never started.
2. **S2320:** persistence read failure could otherwise fail open into an empty state.

## Fixes

### S2321 boot wiring
`app-bootstrap.js` now calls the eager runtime facade:

`__kwInitRuntime()`

with a guarded Promise rejection path when the runtime facade is unexpectedly absent.

`self-test.js` remains lazy as required by S2254/S2261; it is not re-added to the production bundle.

### S2320 persistence protection retained
- failed durable persistence enters recovery-required state;
- boot stops before normal `showMain()`;
- normal `save()` / `saveFlush()` are blocked while recovery is required;
- application must recover the existing data before normal writes continue.

### Cache/release invalidation
Release/cache references were advanced from `2212` to `2213` so the browser/PWA does not keep serving the stale bundle at the old query/cache key.

Canonical build version:
`s2041-1-part-sot-hardening-2213`

Service Worker cache:
`kw-cache-v2213`

## Build verification

- `app-bundle-a.min.js` freshness: **PASS**
- `app-bundle-b.min.js` freshness: **PASS**
- both bundles `node --check`: **PASS**
- persistence-integrity gate: **PASS**
- PWA recovery gate: **PASS**
- window expose gate: **PASS**
- S2320 persistence tests: **3/3 PASS**
- S2321 boot tests: **3/3 PASS**
- S2254/S2261 lazy self-test regression tests: **PASS**
- S1900 Service Worker update tests: **PASS (2/2)**
- combined selected regression tests: **12/12 PASS**

## Important deployment requirement

Upload the cumulative patch files together. Do **not** upload only `app-bootstrap.js` while leaving the old bundle/cache artifacts in production.

The stale browser may retain the old Service Worker/cache. The `2213` cache/query bump is therefore part of the fix.

Production release should still be rebuilt with the project's normal production environment where `esbuild` is installed, because the audit environment did not contain `node_modules/esbuild`. The bundle artifacts in this patch are syntactically valid and fresh, but were generated without minification.
