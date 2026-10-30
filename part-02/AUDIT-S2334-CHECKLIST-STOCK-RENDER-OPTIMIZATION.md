# S2334 — Service Checklist Stock Option Render Optimization

Date: 2026-10-03  
Baseline: `app-main (52).zip` plus cumulative S2333  
Build identity after regeneration: `?v=2221` / `kw-cache-v2221`

## Finding

`Servis.renderServiceChecklist()` builds the same vehicle-scoped stock-option list from `servisPartsStockRead()` inside the `stockOptions()` callback. That callback is used for every checked checklist component. With C checked components and S stock rows, this repeats a full stock read/filter up to C times (O(C × S)) during one synchronous render, even though the vehicle and stock source do not change during that render.

## Change

- Keep stock option generation lazy: when no checked component needs stock options, no stock read is performed.
- On the first checked component, read/filter stock once and reuse the render-local array for subsequent checked components.
- Keep per-component selected-option markup independent, preserving selection behavior.
- Keep vehicle scoping, ordering, labels, quantity formatting, and stock source-of-truth unchanged.
- Add a source-backed render regression test with multiple checked items. It verifies one stock read per render, selected part preservation, and exclusion of another vehicle's stock.

## Complexity

Before: repeated option generation can scan stock once per checked component, O(C × S).  
After: one stock scan/filter per render, O(S + C × O), where O is option-string generation over eligible stock rows for each checked component. This removes repeated filtering; it does not claim to remove the cost of producing each component's HTML option string.

## Validation

- `tests/s2334-checklist-stock-options-cache.test.js`: 1/1 PASS.
- Existing checklist, Car Notes cache/render, viewport, and performance-contract tests are run for the cumulative patch; results are recorded in the patch README.
- No browser/device timing was measured in this environment. The reduction in repeated stock-source reads is established by a regression test, not a wall-clock claim.
- Production minification/release gate remains blocked if `esbuild`/`eslint` are unavailable; do not deploy unminified fallback bundles.

## Cumulative release-gate snapshot

- Cumulative focused regression set (S1839 checklist render, multi-category checklist UI, S2331 navigation cache, S2332 selector DOM idempotency, S2333 viewport coalescing, S2334 stock-option caching, PWA budget): **17/17 PASS**.
- Bundle freshness: **PASS** for both bundles after build identity 2221.
- Performance budget: **PASS**, including Bundle B at 4,923,431 / 5,000,000 bytes (98.5%).
- Patch integrity and contamination checks: **PASS**.
- Release-ready gate: **BLOCKED** by missing `eslint` and `esbuild`/production minification. Other inspected release gates (delete manifest, version/SOT integrity, lifecycle, HTML sync, service SOT, firewall, Car Notes integrity, bundle freshness) passed.
- Full suite: the `npm run test:full` attempt exceeded the execution time limit; no full-suite pass count is claimed.
