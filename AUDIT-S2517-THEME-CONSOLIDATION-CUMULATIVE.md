# S2517 — Theme Consolidation / Duplicate Theme Removal

## Scope
Deep audit of the application theme system on baseline `app-main (8)`, accumulated with the S2515/S2516 PWA hardening chain.

## Implemented
- Shipped picker reduced to 5 intentionally distinct themes: **Dark, Light, Otomatis, Modern, Graphite**.
- Retired near-duplicates: Ocean, Stone, Slate, Mono, Sand, Ink, Sage, Minimal, Pro Dark.
- Legacy persisted values migrate safely:
  - ocean→dark, stone→light, slate→graphite, mono→light, sand→light
  - ink→graphite, sage→light, fresh→light, minimal→modern, pro→graphite
- Unknown values fail closed to Dark.
- Default HTML body theme changed from orphan `fresh` to canonical `dark`.
- Retired base theme tokens/preview rules removed from the main stylesheet.
- Runtime link to Minimal CSS removed; the file is now a zero-CSS compatibility stub.
- Modern light contrast selectors no longer reference retired themes.
- Added S2517 canonical-theme/migration regression tests.
- During cumulative regression, the stale S2461/S2516 restore diagnostic contract was also repaired: diagnostic is cleared at each restore attempt, persisted to `kw_restore_diagnostic_s2013`, carries `categoryComponentReconciliation`, and exposes copy/download/clear helpers.

## Build
- Runtime release: `s2041-1-part-sot-hardening-2246`
- HTML cache-busting: `?v=2246`
- Service-worker cache: `kw-cache-v2246`
- Bundle A/B freshness: PASS.

## Verification
- Theme + restore/SOT targeted suite: **24/24 PASS**.
- SOT integrity: PASS.
- Persistence integrity: PASS.
- PWA recovery integrity: PASS.
- Version integrity: PASS.
- Architecture integrity: PASS.
- Feature regression gate: PASS.
- Release UI suites: 12/12 domain-contract + 15/15 critical-UI tests PASS. The wrapper release-ui-gate remains non-green only because its strict source-size subtest flags pre-existing oversized files.
- Runtime lifecycle: PASS.

## Known release-environment warnings
- `esbuild` is unavailable, so bundles are valid but unminified.
- Strict source-size gate remains red for pre-existing oversized files: `modules/vehicle/servis.js`, `modules/shared/features-helpers-global-security.js`, and `build.js`.
- `docs/AUDIT_MATRIX.md` has stale repository counts; this is a documentation warning, not a runtime/theme failure.
