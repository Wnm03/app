# S2712 — Backup-driven audit: alias normalization and reminder SOT

## Basis audit
- Backup: `backup-keluarga-W-2026-10-20.json` (schemaVersion 11).
- Data inspected: 5 vehicles, 110 service logs, 223 category rows are in vehicle SOT; counts below are per vehicle.
- This audit reads the backup as test data; it does not modify the backup or claim a Chromium run.

## Temuan nyata pada backup
1. **Vario 125:** two reminder categories normalize to the same spelling identity: `Slidepiece cvt` and `Slide Piece CVT`. The first has no `serviceComponentId`, while the second has canonical component `slide-piece-cvt`. Prior alias matching preserved spaces and could leave them as separate identities.
2. **vario 110:** duplicate `Oli Mesin` rows share the exact ID `sp_1787635705426` and component `oli-mesin`. They should produce one reminder identity, not two.
3. **Reminder data is not in `reminders` or `serviceReminderPackages` in this backup** (both arrays are empty); reminder projection must be derived from vehicle SOT + service history, not those empty collections.

## S2712 changes
- Fixed double-escaped regular expressions in `_spNormalizeComponentAlias`; whitespace and word-boundary normalization now executes as intended.
- Compact alias identity removes whitespace after stripping parentheses and known brand/specification suffixes. This makes `Slidepiece CVT` and `Slide Piece CVT` match without merging across vehicles.
- Applied the same compact identity rule in `ServiceCategorySOTReconciliationS2007.componentAlias`, so the SOT projection and service-category resolver agree.
- Added focused regression tests for Busi NGK, Oli Mesin 10W-30, Kampas Rem Depan (Kanan), Slidepiece CVT, duplicate labels, and vehicle scoping.

## 1 SOT boundary
The canonical projection remains the source for reminder rows; this patch only fixes identity normalization and alias dedupe. It does not rewrite historical service records or alter intervals.

## Verification status
- Static source checks and archive integrity are performed when this patch is assembled.
- The added Node regression tests are intended to run with `node --test tests/service-reminder-backup-alias-regression-s2712.test.js` in the application repository.
- Chromium verification with this backup and the full SOT integrity gate are not claimed here.
