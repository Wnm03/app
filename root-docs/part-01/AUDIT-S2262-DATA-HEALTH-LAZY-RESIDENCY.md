# S2262 — Data Health Lazy Residency Audit

## Scope

Audit `data-health-check.js` as the next Bundle-B candidate after S2261.

## Finding

`data-health-check.js` is a diagnostic-only surface opened explicitly from the
maintenance/settings UI. It exposes the existing `runDataHealthCheck()` and
`window.DataHealth` APIs, but it is not required by normal application startup.

The module is large (~60 KB raw) and its cross-domain checks depend on runtime
APIs that are already resident. Therefore it is a safe feature-scoped lazy
boundary when loaded only after the corresponding `data-action` request.

## Repair

- Removed `data-health-check.js` from eager `GROUP_B`.
- Added `ensureDataHealthScripts()` to the existing CSP-aware lazy loader.
- Preserved retry-on-error and promise de-duplication semantics.
- Added lazy dispatcher mappings for `runDataHealthCheck` and `DataHealth`.
- Preserved the original global API after the module is loaded.

## Verification

- S2262 dedicated tests: 6/6 PASS.
- Existing Data Health regression subset: 40/40 PASS.
- Bundle-B residency: 361 files, 4,909,585 raw source bytes.
- Bundle-B artifact: 4,924,642 bytes, UNMINIFIED.
- Bundle freshness: PASS.

## Build limitation

The normal versioned build command is currently blocked by a pre-existing
version-constant drift in four legacy files (`modules-render.js`, `modals.js`,
`modules-calc.js`, `chat-action-handlers.js`) whose constants are one release
behind the canonical `APP_BUILD_VERSION`. No unrelated version bump was made
in this session. The Bundle-B artifact was regenerated through the existing
`build-core` bundling path without changing application version constants, and
its source hash was verified fresh.

Production minification remains release-blocking because `esbuild` is not
available in the current environment.
