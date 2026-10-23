# S2722 — Empty action reset guard

## Finding
`Servis._matchesActionTypeForReset()` normalized a missing or blank action to `ganti`. This contradicted the reminder/history reset policy that missing action evidence is unknown, and could cause a blank-action row to count as a replacement baseline.

## Change
- Normalize null/blank action as an empty unknown value rather than `ganti`.
- Reset classification remains limited to explicit normalized actions `ganti`, `pasang`, or `overhaul`.
- Added regression test `tests/s2722-empty-action-reset-guard.test.js`.
- Rebuilt production bundles and synchronized build/cache version to 2684.

## Validation
- 38 targeted service/reminder tests passed across seven test files.
- `npm run build -- --no-progress` completed; both bundles passed `node --check` as part of build.
- Build still warns that `docs/AUDIT_MATRIX.md` inventory is off by one file and one JavaScript file; this was not silently claimed as resolved.
- Full test suite and browser/WebView runtime were not completed in this step.
