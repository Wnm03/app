# S2709 — Car Notes audit fixes (baseline app-main 37)

## Implemented

1. **Unknown service history no longer becomes a due reminder.** `VehicleReminder.serviceReminders()` now includes only actionable statuses (`terlewat`, `jatuh_tempo`, `segera`, `mendekati`); unknown/null statuses no longer display as `0 km` reminders.
2. **Fuel maintenance impact excludes unknown status.** The shared keyword matcher now uses the same actionable-status allowlist.
3. **Health score ignores unknown maintenance evidence.** Only known service statuses contribute to the service score denominator. Unknown/no-history rows are not scored as failures; if there is no known service status and no usable fuel data, the result remains `Data Kurang` rather than manufacturing a low score.
4. **Service Master loader collision addressed.** The internal loader is now `_smdEnsureLoaded`, while the supported public API remains `ServiceMasterDB.ensureLoaded`. This prevents a same-named global function in another concatenated source from replacing the service-master loader.
5. **SIM reminders added to the unified reminder stream.** `D.simList` remains the source of truth; reminders use the existing `dateStatusBadge()`/`daysUntilDate()` classification and do not migrate or rewrite SIM data.
6. **Category label normalized** to `Body & Kontrol` in the category chip data.
7. **Navigation recovery improved.** `nav-scroll.js` reveals the navigation when a user intentionally clicks a primary/sub-tab or navigation item, preventing it from remaining translated off-screen after content changes.
8. Added S2709 regression tests and rebuilt app bundles/version references to **v2662**.

## Data and SOT safety

- No user-data migration or write was added.
- Existing `D.simList`, service history IDs, category IDs, and component IDs were not rewritten.
- Duplicate **“Kabel Rem Belakang”** entries were intentionally not merged/deleted. There are two distinct IDs; a safe consolidation requires a reviewed alias/mapping plan so historical logs and reminder references are preserved. This remains an open substantive data-integrity item, not claimed fixed.
- The motor-specific visibility of “Uji Kelayakan” and duplicated “Insight AI” heading were not changed because they require separate product/UI behavior decisions and broader runtime validation.

## Verification

- `node scripts/build.js`: **PASS**, generated bundle syntax checks pass, `index.html` and `app_production.html` version references synchronized at v2662.
- `node --check` on changed JavaScript and both generated bundles: **PASS**.
- Targeted tests: **14 passed, 0 failed** (S2709 regression tests, ServiceMasterDB tests, service-reminder SOT test).
- `node scripts/verify-carnotes-integrity.js`: **PASS** (`scanned=548`, `forbidden=0`, `duplicateIds=0/0`, `ServisDeclarations=1`).
- Full `npm test` and the sharded full-test runner did not finish within the execution window; therefore full-suite PASS is **not established**.
- Chromium headless smoke launch also timed out in this environment; no claim of a completed post-patch browser interaction audit is made.

## Remaining validation before claiming zero substantive defects

- Resolve or explicitly approve the duplicate “Kabel Rem Belakang” mapping while preserving old history.
- Re-run the real Chromium flow after patch: fresh onboarding, Car Notes tabs, service master reads through IndexedDB, reminder counts/health score, SIM H-20, nav recovery after “Rekomendasi & Tren”, backup/restore roundtrip, and desktop-width layout.
- Complete the full test suite and service SOT integrity gate in an environment where they finish within the runner timeout.
