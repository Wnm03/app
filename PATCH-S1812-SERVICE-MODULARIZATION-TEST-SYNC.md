# S1812 — Service Modularization + Test Synchronization

Cumulative patch based on S1811. This patch preserves every file from the prior S1811 patch and adds only the S1812 fixes below.

## Changes

1. Split `modules/vehicle/servis.js` into:
   - `modules/vehicle/servis.js` — existing coordinator/UI/save logic, now below the strict 1600-line source gate.
   - `modules/vehicle/servis-b.js` — extracted service-history/reminder/integrity methods, attached with `Object.assign(Servis, ...)` after the original module loads.
2. Updated `scripts/build.js` so `servis-b.js` loads immediately after `servis.js`.
3. Synchronized generic service recommendation records so brake-pad recommendations are canonical:
   - `Kampas Rem Depan`
   - `Kampas Rem Belakang`
   and no longer generate generic `Kampas Rem` recommendations.
4. Synchronized `tests/database-api-master-generic-wiring-followup.test.js` with the canonical recommendation/group data.
5. Updated `tests/service-maintenance-guidance-s1811.test.js` to inspect the combined `servis.js` + `servis-b.js` source after the split.

## Compatibility

- Public `Servis.*` methods remain on the same global object.
- No oversized-file allowlist entry was added.
- No legacy service-history data is deleted.

## Validation performed

- `node --check` on all changed service/database source files: PASS.
- `node scripts/build.js`: PASS; version synchronized to 1812 in the staging build.
- Strict source-size gate: PASS; no source JS file over 1600 lines.
- Car Notes permanent integrity gate: PASS.
- S1810 service component/action tests: PASS.
- S1811 guidance tests: PASS after source/test synchronization.
- DatabaseAPI generic wiring tests: PASS after expectation synchronization.
- Maintenance registry tests: PASS.

The complete `npm test` suite was started against the staging tree but exceeded the execution window in this environment after the existing long-running suite reached the finance/owner tests; therefore no claim of a complete 6916/6916 run is made here.
