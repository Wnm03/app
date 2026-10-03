# S2333 — Baseline Performance Audit & Safe Runtime Optimization

Date: 2026-10-03  
Baseline: `app-main (52).zip` (cumulative through S2332)  
Build identity: `s2041-1-part-sot-hardening-2220` / `?v=2220` / `kw-cache-v2220`

## Scope and evidence

This is a static source/artifact audit plus focused Node regression testing. No Android/WebView browser profiler was available, so this report does not claim measured wall-clock improvement.

Verified baseline artifact sizes before this change:

- `index.html`: 319,791 / 320,000 bytes (99.9% budget)
- `app_production.html`: 319,984 / 320,000 bytes (100.0% budget)
- `styles.css`: 179,550 / 180,000 bytes (99.8% budget)
- `pwa-ui-layer.css`: 14,987 / 15,000 bytes (99.9% budget)
- `app-bundle-a.min.js`: 1,532,085 / 1,600,000 bytes (95.8% budget)
- `app-bundle-b.min.js`: 4,923,336 / 5,000,000 bytes (98.5% budget)

The source tree has established controls for cache invalidation at save boundaries and Car Notes idempotent rendering (S2331/S2332). Those optimizations are preserved. The runtime-IO and scalability scripts report many static candidates, but those reports alone do not prove a hot path and should not trigger broad refactors.

## Findings and recommended order

1. **Production bundle mode is the largest confirmed release concern.** The current environment has no `esbuild` or `eslint`; the build fallback produces syntactically valid but unminified bundles. The release gate correctly blocks this state. Install the declared toolchain in the release environment and build with `npm run build:release`; do not treat raw bundle size as optimized production size.
2. **HTML/CSS/bundle budgets have little headroom.** Avoid feature growth in the shared shell; use measured module contribution and dependency tracing before moving modules to lazy load. Do not split GROUP_B based on raw source file size alone.
3. **Data-history scans are scale-sensitive.** Finance transaction aggregation and vehicle service/fuel history paths include linear scans. Benchmark at 100/1k/5k/10k/25k synthetic records before introducing indexes or derived caches; ensure all relevant mutations invalidate them.
4. **Repeated viewport events can cause redundant synchronous style writes.** Resize, orientation, and visual viewport events all reached the same update function directly. On mobile WebView, these event bursts are now coalesced to one animation-frame update, with a 16 ms timer fallback where `requestAnimationFrame` is unavailable.
5. **Existing S2331/S2332 gains must remain intact.** Ordinary navigation must not invalidate finance caches, and unchanged vehicle selector markup must not be rebuilt. No changes to business calculations, persistence schema, navigation routes, or service history source-of-truth were made.

## Change in S2333

- `modules/shared/pwa-ux-performance.js`: coalesce resize/orientation/visualViewport events to one pending update per animation frame; add timer fallback; initial viewport application remains synchronous.
- `tests/s2333-viewport-update-coalescing.test.js`: verifies event-burst coalescing, latest viewport values, keyboard-state update, and fallback behavior.
- Rebuild all generated artifacts and synchronize cache identity to version 2220.
- Preserve `DELETE-FILES.txt` (`pro-ui-layer.css`) in the cumulative patch package.

## Validation results

- S2333 viewport coalescing tests: **2/2 PASS**.
- Combined PWA/mobile viewport/version regression set: **23/23 PASS**.
- Bundle freshness: **PASS**; both bundle source hashes match.
- Performance budget: **PASS**; `app-bundle-a.min.js` is now 1,532,668 bytes and `app-bundle-b.min.js` remains 4,923,336 bytes.
- Patch integrity: **PASS**; contamination audit: **PASS**.
- Release gate: **BLOCKED** because `eslint` and `esbuild` are unavailable; artifacts are fresh but unminified.
- Full test suite: **NOT CONFIRMED**; `npm run test:full` exceeded the execution time limit. No full-suite pass count is claimed.
- Device performance: **NOT MEASURED**; Android/WebView profiling is still required to quantify real-world latency improvement.

## Release decision

S2333 is a cumulative optimization patch, **not release-ready**. Do not deploy until the full suite completes, lint and required minification run in the release environment, `node scripts/verify-release-ready.js` passes, and representative Android/WebView profiling confirms no UI regression.

## Next implementation stage

1. Re-run production build with installed `eslint` and `esbuild`, then compare minified artifact sizes.
2. Capture cold/warm startup, navigation p50/p95, long tasks, and memory on the same Android/WebView device.
3. Profile representative large synthetic Finance + Vehicle + Shop/Stock datasets.
4. Only then implement the highest-cost proven hot paths (likely derived aggregate reuse or feature-level lazy loading) with invalidation/dependency contracts and focused regression tests.

## Cumulative continuation note (S2334)

S2333's original build identity was 2220. The cumulative S2334 patch regenerates artifacts at build identity 2221 and adds a render-local cache for vehicle-scoped stock options in the service checklist. See `AUDIT-S2334-CHECKLIST-STOCK-RENDER-OPTIMIZATION.md` for the current cumulative validation and release-gate status.
