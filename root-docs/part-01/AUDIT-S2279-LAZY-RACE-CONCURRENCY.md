# S2279 — Lazy Loader Race / Concurrency Matrix

## Scope
Deterministic VM audit of `modules/shared/feature-lazy-loader.js` against concurrent callers. This complements S2274 cold-start, S2277 eager→lazy contracts, and S2278 runtime invocation.

## Checks
1. Three concurrent Vehicle Catalog calls share one in-flight loader and do not duplicate script loads.
2. A single loader serializes `_loadScriptOnce` calls; no overlapping dependency loads are introduced by concurrent callers.
3. Honda PDF, Shop PDF, and direct Vehicle Catalog calls concurrently share the Vehicle Catalog boundary.
4. Honda PDF remains downstream of Vehicle Catalog.
5. Shop PDF remains downstream of Vehicle Catalog.
6. A shared loader failure propagates to all concurrent callers.
7. A failed shared loader resets its promise and can be retried successfully.
8. The complete matrix reports PASS only when all checks pass.

## Result
**S2279: 8/8 PASS**.

This is a deterministic Node/VM concurrency simulation, not browser/device E2E. It does not claim real Service Worker or DOM timing coverage.
