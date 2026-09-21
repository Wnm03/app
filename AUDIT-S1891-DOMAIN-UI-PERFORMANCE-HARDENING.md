# S1891 — Domain UI Redesign + PWA Performance Hardening

## Baseline
- `app-main (38).zip`
- Cumulative predecessor: S1890
- Runtime build: `s1877-selftest-persistence-fix-1884`
- HTML cache version: `1884`
- Service Worker cache: `kw-cache-v1884`

## Scope implemented in one stage

### Real UI redesign
The Shop, Car Notes/Uang Mobil, and Pajak & Zakat pages now have real structural presentation changes, not only responsive CSS:
- domain hero / workspace introduction
- primary action cards
- distinct workspace headers per tab/pane
- domain-specific visual hierarchy
- Shop KPI strip treatment
- vehicle context treated as a primary workspace element
- tax/zakat workflow separated into clear workspaces
- existing tab IDs, routing and `data-action` contracts retained

### PWA performance
- Added `modules/shared/pwa-ux-performance.js`.
- Expensive Shop/Kasir and sparepart search renders are debounced (140–160 ms).
- Large rendered lists are marked for browser-side deferred layout with `content-visibility:auto` once they exceed 120 children; this avoids an unsafe generic DOM virtualization rewrite across heterogeneous legacy list renderers.
- Offline/online state is reflected in the new domain status pills.
- Added lightweight domain-tab helper without introducing a framework.
- No new external runtime dependency.

### Release / quality tooling
- Added `npm run release:ui-gate` as a single lightweight UI/PWA gate.
- Added structural domain-redesign and performance contracts.
- Existing critical Car Notes golden DOM anchors were preserved.
- Removed retired `pro-ui-layer.css` remains enforced by the delete manifest.

## Verification

### Passed
- S1891 domain contract: **12/12 PASS**
- Combined focused UI/PWA + Car Notes contracts: **28/28 PASS**
- Performance budget: **PASS**
  - index.html: 318,348 / 320,000
  - app_production.html: 318,541 / 320,000
  - pwa-ui-layer.css: 13,538 / 15,000
  - bundle A: 1,475,030 / 1,600,000
  - bundle B: 4,897,715 / 5,000,000
- `release:ui-gate`: **PASS**
- SOT: **PASS**
- Architecture: **PASS**
- Persistence: **PASS**
- PWA recovery: **PASS**
- Feature regression: **PASS**
- Release firewall: **10/10 PASS**
- Bundle freshness: **PASS**
- Window expose: **83/83 PASS**
- Car Notes integrity: **PASS**
- Car Notes performance: **PASS**
- App-wide hardening: **9/9 PASS**
- Runtime I/O audit: completed; reported existing/manual-review hotspots, no new S1891 storage subsystem added
- Event-listener / scalability / duplicate audits: completed without a failing gate

### Not claimed as PASS
- `npm test` reached test **4063** before the 300-second execution limit; it did not produce an aggregate final summary. Therefore full-suite PASS is not claimed.
- Browser visual smoke/regression remains environment-blocked; no browser visual PASS is claimed.
- `esbuild` is unavailable in the environment, so release bundles are syntactically valid but not minified by esbuild.

## Design decision
A generic virtual-DOM/virtual-list replacement was intentionally not introduced. Existing Shop/Vehicle/Tax list renderers have heterogeneous row/card structures and business actions. The safe S1891 optimization is threshold-based browser layout deferral plus targeted search debounce. A true virtualization layer should be introduced only after profiling each list renderer independently.
