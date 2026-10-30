# S2332 — Additional Car Notes Render Optimization

Date: 2026-10-03
Baseline: cumulative S2330 + S2331
Build identity: `s2041-1-part-sot-hardening-2219` / `?v=2219` / `kw-cache-v2219`

## Additional finding

`renderVehicleSelect()` and `renderCarImportVehicleSelect()` rebuilt their DOM contents on every call, including ordinary Car Notes navigation, even when the vehicle catalogue and selected vehicle were unchanged. Replacing identical `innerHTML` recreates chip/option nodes and can disrupt focus/selection while forcing avoidable DOM work.

## Change

- Both renderers now build their existing HTML from the same source data and compare it with the current `innerHTML` before writing.
- The vehicle chip renderer still runs `renderVehicleSpecCard()` on every call; this optimization does not suppress the existing specification presenter.
- The import selector retains the previous selection when valid and updates the selected vehicle if the previous selection is no longer valid.
- Changed vehicle names/catalogue or active vehicle still produce a DOM update.
- No service calculations, persistence schema, event-action contract, route contract, or canonical source-of-truth was changed.

## Validation

- S2332 DOM idempotency regression tests: **4/4 PASS**.
- Combined focused Car Notes/navigation/cache/persistence/PWA suite: **21/21 PASS**.
- `node --check` on `modules/shared/modules-render-b.js` and both generated bundles: **PASS**.
- Bundle freshness: **PASS**, hashes match source.
- Version integrity: **PASS** (`2219` / `kw-cache-v2219`).
- Delete manifest: **PASS** (`pro-ui-layer.css` absent).
- Performance budget: **PASS**. HTML, CSS, and bundle sizes remain below configured limits; several are close to their budget.
- Car Notes performance guard: **PASS**. Scalability audit remains a proxy; browser profiling is still needed to measure wall-clock latency on Android/WebView.
- Full test suite: **not confirmed**. `node scripts/run-full-test.js` exceeded the execution time limit.
- Release gate: **BLOCKED** because `eslint` and `esbuild` are unavailable. Bundles are fresh and syntactically valid, but unminified.

## Deployment status

This is a cumulative validation patch, **not marked release-ready**. Install/enable ESLint and esbuild, complete the full suite, rerun `node scripts/verify-release-ready.js`, then profile page transitions on Android/WebView before production deployment.
