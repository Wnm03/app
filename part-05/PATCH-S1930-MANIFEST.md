# PATCH S1930 — Mobile UI Scroll / Cache Hardening (as delivered)

Target baseline: `app-main (1).zip` (already at `?v=1908` / `kw-cache-v1908`,
i.e. the S1929-accumulated-fixed-v1908 state)
Release identity: `s1930-mobile-ui-cache-hardening-1930` / `?v=1930` / `kw-cache-v1930`

## Content
As shipped by the patch author, no changes made this session:
- modules/shared/modals.js
- modules/shared/features-helpers-global-security.js
- modules/shared/modules-render.js
- modules/shared/modules-calc.js
- app_production.html, index.html, sw.js, styles.css
- app-bundle-a.min.js, app-bundle-b.min.js (prebuilt by the patch author)
- chat-action-handlers.js
- tests/s1904-runtime-integrity-hardening.test.js (updated)
- tests/s1930-mobile-ui-cache-hardening.test.js (new)

No DELETE-FILES.txt was needed — pro-ui-layer.css was already removed by the
prior S1929-accumulated-fixed-v1908 patch.

## Test status
- Full suite: 7332 tests, 7332 pass, 0 fail. Clean on first application — no
  fixes needed this round.
- Release-ready gate: PASSES with the usual sandbox overrides for lint (eslint)
  and minify (esbuild), both unavailable in this environment. All other gates
  green, including bundle-freshness (bundles were already fresh as shipped).
