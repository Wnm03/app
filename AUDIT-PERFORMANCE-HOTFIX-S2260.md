# Audit & Patch S2260 — startup/persistence/photo hot paths

## Base
`app-main (4).zip` — inspected source tree, package scripts, persistence implementations, service-photo handling, and PartCrud observer.

## Changes
1. `npm run build` now requires esbuild minification and fails closed if unavailable; `npm run build:dev` preserves the explicitly unminified local fallback. `npm run build:release` remains available.
2. Service photos reuse `downscaleImage(file, 1280)` before DataURL encoding. Existing 5 MiB input and five-photo guards remain in place; helper fallback to original file remains supported.
3. `saveFlush()` keeps IndexedDB scheduling and its synchronous localStorage safety mirror for snapshots up to 3 MiB. For larger snapshots it skips the synchronous mirror to avoid a long main-thread write and logs one warning per page lifetime. Large snapshots rely on the IndexedDB primary path; `saveFlush()` does not prove that the asynchronous IndexedDB transaction has already committed.
4. `PartCrudS2041` body observer coalesces mutation bursts into one refresh per 80 ms and performs a final refresh when the two-minute observer window ends.

## Verification
Run `node --test tests/performance-hotfix-s2260.test.js`, relevant persistence/service tests, then the full suite. Release builds require `esbuild` available. This patch does not include regenerated bundles; run `npm run build` in the release environment and include generated bundle/version updates via the project's normal build workflow.

## Caveat
This is source-level/static hardening, not device profiling. It cannot prove real-device frame-time improvements or IndexedDB commit timing without representative data and browser profiling.
