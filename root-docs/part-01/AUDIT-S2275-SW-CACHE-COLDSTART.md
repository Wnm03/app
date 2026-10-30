# S2275 — Service Worker / Cache Cold-Start Contract Audit

## Scope

Audit the PWA service-worker lifecycle and cache behavior at the cold-start boundary after the S2274 lazy-loading work.

This session is a deterministic Node/VM contract test; it does **not** claim a real browser/device E2E run.

## Verified contracts

1. `install` calls `skipWaiting()` and precaches the current `kw-cache-v*` cache.
2. `activate` deletes stale cache versions and calls `clients.claim()`.
3. Same-origin static assets use `cache: 'no-cache'` network-first behavior and refresh the current SW cache.
4. Navigation requests prefer fresh network responses and fall back to the cached shell on offline/error paths.
5. Offline static assets fall back to the current cache.

## Result

- S2275 contract tests: **5/5 PASS**
- Runtime source changes: **none**
- Browser/service-worker native E2E: **not claimed; browser runtime unavailable in this audit environment**.

## Decision

No runtime patch is required for S2275. The existing service-worker implementation satisfies the audited cache lifecycle contracts.
