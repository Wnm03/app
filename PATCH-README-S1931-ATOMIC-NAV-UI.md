# PATCH S1931 — Atomic Mobile Navigation / UI Regression Fix

Baseline: `app-main (2).zip` (S1930)
Patch type: cumulative fix; only changed/fixed files are included.

## Root cause addressed

The previous `showPage()` implementation removed the current `.page.active` before running `renderPageContent(name)`. On a slow Android/WebView presenter this created a blank interval. The bottom-nav active state was also committed before rendering finished, allowing a visible desynchronization where the nav still showed Mobil while the destination content was Pajak (or another page).

## Fix

1. `modules/shared/modal-navigasi.js`
   - Keep the previous page painted with `nav-transition-hold` while destination rendering runs.
   - Mark destination active for renderer context but hide it with `nav-transition-pending` until render completes.
   - Commit page visibility + bottom-nav active state only after render completes.
   - Existing invalid-page, ScannerSession, overlay cleanup, toast cleanup, and render-error recovery contracts remain intact.

2. `styles.css`
   - Mobile page transitions remain animation-free.
   - Added explicit hold/pending transition states.
   - Consolidated redundant S1930 mobile rules into the S1929/S1931 contract.
   - Removed a duplicate Car Notes mobile-tab rule block.
   - `styles.css`: **179,925 B**, below the 180,000-B release budget.

3. `app-bundle-b.min.js`
   - Production bundle updated with the same S1931 `showPage()` implementation.
   - Embedded source hash updated and verified fresh.

4. Tests
   - `tests/s1925-navigation-cache-smoke-contract.test.js` updated for the new atomic navigation contract.
   - `tests/s1930-mobile-ui-cache-hardening.test.js` updated to recognize the consolidated S1931 transition contract.
   - `tests/s1931-navigation-atomic-transition.test.js` added for the new regression boundary and CSS budget.

## Verification

PASS:
- bundle freshness
- bundle syntax (`node --check` A/B)
- window-expose gate
- feature regression gate
- architecture integrity gate
- persistence integrity gate
- PWA recovery integrity gate
- release UI gate
- patch contamination gate
- performance budget gate
- 104 targeted navigation/UI/cache/dashboard/settings tests

Performance result:
- `styles.css` 179,925 / 180,000 B
- `pwa-ui-layer.css` 14,987 / 15,000 B
- `app-bundle-b.min.js` 4,907,757 / 5,000,000 B

Note: the unrestricted full `npm test` run did not complete within the available execution window; the targeted regression suite and all release gates above passed.

## Deployment / device verification

After applying this patch, perform a fresh PWA runtime verification on the Android device: fully close the PWA, clear site data or uninstall/reinstall, open the new deployment, then switch Dashboard → Mobil → Aset → Pajak → Setting repeatedly and verify that no blank/fade interval occurs and the bottom-nav highlight changes together with the displayed page.
