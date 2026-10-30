# Cumulative performance patch S2334

This archive accumulates the S2333 viewport-event coalescing patch and S2334's render-local service-stock option cache over `app-main (52).zip`.

## Changes

- S2333: coalesce resize/orientation/visualViewport bursts to one pending animation-frame update (16 ms timer fallback); retain synchronous initial viewport state.
- S2334: lazily read/filter vehicle-scoped stock options once per `Servis.renderServiceChecklist()` render and reuse that list across checked components.
- Include corresponding regression tests and audit reports.
- Preserve `DELETE-FILES.txt` with the existing `pro-ui-layer.css` deletion entry.
- Generated HTML, bundles, and service worker are regenerated together with cache identity `?v=2221` / `kw-cache-v2221`.

## Validation status

See `AUDIT-S2334-CHECKLIST-STOCK-RENDER-OPTIMIZATION.md` and `AUDIT-S2333-BASELINE-PERFORMANCE-OPTIMIZATION.md`. Passing focused tests do not replace the full release gate. The production release gate remains blocked until the declared lint/minification toolchain is available and the full suite/release checks complete. Device profiling is still required for end-to-end latency and memory claims.
