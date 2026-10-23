# S2725 — Legacy action fallback and inventory contract repair

## Findings reproduced

1. `service-maintenance-guidance.js` used `String(s.actionType || 'ganti')` in the unscoped history-summary fallback. A legacy row with missing/empty action could therefore be reported as a replacement.
2. `servis.js` used `(log.actionType || 'ganti')` in the reminder-history fallback when the reset-action helper was unavailable. This could select an unknown-action legacy record as a replacement baseline.
3. The cumulative inventory test still hard-coded the S2715-era counts while `docs/AUDIT_MATRIX.md` and the current repository inventory had advanced. The stale assertion failed in the service-focused suite.

## Changes

- Missing/empty history action is now normalized to an empty string in both history-reader fallbacks; it is not silently upgraded to `ganti`.
- Kept `ganti` defaults on new-service form/mark actions unchanged because those are explicit creation defaults, not history inference.
- Updated the inventory baseline and its regression contract to the current canonical counts: 3,789 total files, 2,095 JavaScript, 1,407 Markdown, 7 HTML, 31 JSON, 4 CSS.
- Rebuilt bundles and synchronized app/cache version to 2690.
- Accumulated the previous S2710–S2724 patch files; ZIP contains changed/required patch files only, not the full app release.

## Verification

- Service-related focused suite: 822 passed, 0 failed.
- Targeted S2724 no-fallback and S2715 inventory tests: 4 passed, 0 failed.
- Build completed; both bundle syntax checks passed.
- `scripts/verify-bundle-freshness.js`: passed.
- Full all-repository test suite and browser/WebView runtime against the actual user backup are not claimed complete in this patch.
