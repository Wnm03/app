# PATCH-S2007-S2008 — ATOMIC CUMULATIVE OVERLAY B2004

## Status
IMPLEMENTED + VERIFIED on top of `S2000-S2006-FINAL-RELEASE-B2000`.

## Scope completed in one stage

### S2007 — Category Sparepart → ServiceComponent → Interval → Reminder
- Added `modules/vehicle/service-category-sot-reconciliation-s2007.js`.
- Canonical explicit `serviceComponentId` remains authoritative.
- Exact-name legacy mapping is audit-only/safe-projection when interval evidence does not conflict.
- Interval conflicts are review-only; no guessed migration.
- Duplicate canonical component reminder rows are projected deterministically to one row.
- Historical service records are not rewritten.

### S2008 — History count vs reset baseline
- Reminder card now distinguishes:
  - history exists, and
  - history eligible to reset the current reminder interval.
- When history exists but no reset-eligible baseline exists, the UI says:
  `Belum ada riwayat yang mereset interval`
  instead of the misleading `Belum pernah dicatat`.
- No data mutation is performed by this UI correction.

## Data audit
Backup used: `backup-keluarga-W-2026-09-24.json`.

- 74 sparepart categories
- 87 service history rows
- 29 active reminder categories without explicit `serviceComponentId`
- 7 exact-name safe-link candidates
- 5 interval-conflict candidates
- 17 categories without proven canonical mapping
- 5 duplicate canonical component groups
- 8 historical rows missing interval/next-due snapshots
- 1 history/category vehicle mismatch

The remaining legacy/review records are intentionally not mass-migrated because the available evidence is insufficient. No historical interval or next-due value is fabricated.

## Tests / gates
- S2007/S2008 focused tests: **6/6 PASS**
- S2005 reconciliation regression: **8/8 PASS**
- Service test family: **281/281 PASS**
- Empty-catch regression: **PASS**
- Bundle freshness: **PASS**
- Bundle syntax: **PASS**
- Window expose: **83/83 PASS**
- Strict source-size: **PASS** (existing `modules/vehicle/servis.js` remains warning-only at 1,799 lines)
- Build: **PASS**, release version **v2004**
- `index.html` / `app_production.html` / `sw.js`: synchronized to v2004

## Full repository regression
The complete `npm test` run was not allowed to finish within the execution window. Two known pre-existing Minimal-theme assertions were observed:
- `minimal-theme-ui-audit.test.js` — index.html expects `minimal-ui-theme.css?v=1`
- `minimal-theme-ui-audit.test.js` — app_production.html expects `minimal-ui-theme.css?v=1`

These expectations conflict with the repository's current versioned cache-busting scheme (`v2004`). No change was made to those tests because they are unrelated to S2007/S2008 and were already present in the cumulative baseline.

## Release hygiene
- No prior S2000-S2006 session artifact is deleted.
- No backup JSON is mutated.
- Generated build backups and transient test checkpoints are excluded from the final release ZIP.
