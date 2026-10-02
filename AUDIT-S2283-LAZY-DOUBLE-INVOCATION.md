# S2283 — Lazy Loader UI Double-Invocation / Re-entry Matrix

## Scope
Audit the existing `data-action` lazy-loading dispatcher for repeated user events while a lazy feature loader is pending.

## Result
**9/9 PASS.** No production defect identified in the audited re-entry contract.

The dispatcher already establishes `el.dataset.lazyActionPending='1'` before starting the loader and only enters the lazy branch when that flag is absent. Therefore repeated events on the same element while the loader is pending are suppressed. The flag is cleared on both successful continuation and loader failure, so a later event can invoke or retry normally.

The S2282 stale-invocation token/action/connection guard remains in place.

## Boundary
This is a deterministic source/behavioral contract audit. It is not a browser/device E2E test and does not claim protection against multiple independent DOM elements intentionally invoking the same action; that is a separate domain-level idempotency concern.
