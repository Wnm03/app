# CUMULATIVE PATCH S1922 (rebuilt) — Car Notes / Dashboard / Settings

Target baseline: `app-main (42).zip`
Release identity: `s1908-cumulative-regression-hardening-1904` / `?v=1904` / `kw-cache-v1904`

## Content
- Original S1922 source changes (Car Notes dashboard/settings hardening):
  - modules/vehicle/vehicle-core.js
  - modules/dashboard-hub/dashboard-hub.js
  - modules/shared/pengaturan-search.js
  - styles.css, pwa-ui-layer.css
  - tests/s1920-mobile-dashboard-settings-hardening.test.js
  - tests/s1921-carnotes-mobile-tab-visibility.test.js
- Rebuild output (required — the original S1922 zip shipped source changes without
  rebuilding, leaving app-bundle-b.min.js stale against the new source hash):
  - app-bundle-a.min.js, app-bundle-b.min.js (node scripts/build.js, unminified —
    esbuild not available in this environment)
  - index.html, app_production.html, sw.js (version bumped 1903 → 1904 by build.js)
  - chat-action-handlers.js, docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md
  - modules/shared/features-helpers-global-security.js, modules/shared/modals.js,
    modules/shared/modules-calc.js, modules/shared/modules-render.js
    (build.js re-stamps internal version markers across these files)

## Delete
- pro-ui-layer.css (see DELETE-FILES.txt)

## Test status
- Full suite: 7301 tests, 7298 pass, 3 fail.
- The 3 failures are pre-existing stale hardcoded-version assertions, not caused by
  this patch's own logic:
  - tests/s1905-baseline-runtime-integrity.test.js:10 — expects a literal old
    APP_BUILD_VERSION string.
  - tests/s1906-runtime-null-guard-regression.test.js:33 — expects an older,
    less-guarded closeQS() literal (current code is a superset/improvement).
  - tests/s1909-similar-regression.test.js:54 — expects release identity literally
    "...-1903"; now correctly "...-1904" after this rebuild.
  These three tests need their hardcoded expected strings updated to "-1904" /
  the newer closeQS() body; not addressed here since it wasn't asked for.
- Release-ready gate: PASSES with sandbox overrides for lint (eslint) and
  minify (esbuild), both unavailable in this environment.
