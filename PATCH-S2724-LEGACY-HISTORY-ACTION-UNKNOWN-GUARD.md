# S2724 — Legacy history action fallback guard

## Audit result
The cumulative S2723 source already uses an empty-string fallback (rather than `ganti`) in two history projections when the action-reset helper is unavailable:
- `modules/vehicle/service-maintenance-guidance.js` — history summary (`lastInspected` / `lastReplaced` / `lastCleaned`).
- `modules/vehicle/servis.js` — reminder-linked history selection fallback.

The risk is subtle and easy to reintroduce during future refactors, so S2724 adds explicit regression contracts for both paths. This patch does not claim those two production lines were newly changed in S2724; they are preserved from the cumulative base.

## Additional audit repair
`docs/AUDIT_MATRIX.md` contained two stale inventory snapshots. The current replay snapshot and the build-lint baseline are now aligned with the build's inventory: 3,787 files, 2,095 JavaScript files, 1,454 `*.test.js` files, 1,406 Markdown files, 7 HTML files, 30 JSON files, and 4 CSS files. The build now reports the inventory baseline as synchronized.

## Validation
- Focused regression set: 17/17 tests passed across five test files.
- Build: `npm run build -- --no-progress` completed successfully.
- Both production bundles passed `node --check`.
- HTML cache-busting values and service-worker cache name synchronized to build/cache version 2689.
- Full test suite and browser/WebView runtime replay against the user's actual backup are still outstanding; no zero-bug claim is made.
