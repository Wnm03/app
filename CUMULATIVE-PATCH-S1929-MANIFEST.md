# CUMULATIVE PATCH S1929 (v2 + test-suite fixes) — Mobile UI / Navigation / Insight Security

Target baseline: `app-main.zip` (full source tree, pre-S1929)
Release identity: `s1908-cumulative-regression-hardening-1908` / `?v=1908` / `kw-cache-v1908`

## Content
1. **S1929 v2 mobile UI + insight-security patch** (as delivered):
   - Native vertical scroll hardening (#scrollRoot, 100dvh + fallback, safe-area).
   - Horizontal overflow containment on .page/.pwa-domain-page.
   - Shop workflow tabs: wrapping grid instead of clipped nowrap rail.
   - Floating bottom-nav overlap reserve (108px + safe-area).
   - FeatureInsightUI `safeInsightText()`: single-pass escaping with selective
     `<b>`/`</b>` token restore for the app's own intentional bold text; removed
     upstream pre-escaping of user names that caused double-encoded display
     output (`&amp;lt;` etc.) while keeping injection impossible (verified by hand
     with a malicious product-name payload — see chat history).
   - Insight navigation routing fixes (Piutang/Utang, Budget, Zakat/PBB, Shop,
     Car Notes, Sewa/Renovasi) via central `FinCoach.openAction()`.
   - `DELETE-FILES.txt` for retired `pro-ui-layer.css`.
   - Bundles prebuilt at 1907 by the patch author.

2. **Rebuild to 1908** (this session): `node scripts/build.js` re-run after the
   test-suite fixes below, bumping version/cache markers and re-stamping the
   internal version constants across modules-render.js, modals.js,
   modules-calc.js, chat-action-handlers.js, features-helpers-global-security.js.

3. **Test-suite fixes** (this session — closes every remaining gap from prior
   S1929 review rounds):
   - `tests/innerhtml-audit-s27.test.js` — updated the FeatureInsightUI literal
     assertion from `escapeHtml(x.text)` to `safeInsightText(x.text)` (and
     `emptyMsg` likewise), plus an added assertion that `safeInsightText` itself
     is escapeHtml-backed, so the security intent (single escape pass over any
     user/data-controlled text) is still verified, just against the new helper.
   - `tests/service-innerhtml-surface-v23.test.js` — same literal update for
     `feature-insights.js`'s two checks.
   - `tests/s1905-baseline-runtime-integrity.test.js` — the "internally
     consistent" version check no longer hardcodes an external version literal;
     it now extracts `APP_BUILD_VERSION` from source and asserts
     `PRODUCTION_BUILD_SYNCED_VERSION` matches it. This test will no longer go
     stale on every future version bump.
   - `tests/s1906-runtime-null-guard-regression.test.js` — same fix: bundle/
     HTML/service-worker version markers are now checked for mutual consistency
     with the source-derived build number, not a hardcoded `1903`.
   - `tests/s1909-similar-regression.test.js` — same fix for the "release
     identity sinkron" test.

## Delete
- pro-ui-layer.css (see DELETE-FILES.txt)

## Test status
- Full suite: **7329 tests, 7329 pass, 0 fail.**
- Release-ready gate: PASSES cleanly (sandbox overrides only for lint/eslint and
  minify/esbuild, both unavailable in this environment). All other gates green,
  including bundle-freshness, version-integrity, SOT, car-notes-integrity.

## Note on the version-consistency test rewrites
These three tests previously hardcoded a specific build number (e.g. `1903`)
and broke on every subsequent rebuild even when the app was perfectly
consistent internally. They now assert *internal* consistency (all version
markers agree with each other) instead of matching an external literal, so
this class of false failure should not recur on future rebuilds.
