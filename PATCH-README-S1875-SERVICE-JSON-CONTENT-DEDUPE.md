# S1875 — Service JSON Import Content-Based Deduplication

## Evidence
- Backup `backup-keluarga-W-2026-09-19.json`: 101 `servisLogs` records.
- Exact comparison excluding `id`, `idempotencyKey`, `createdAt`, and `updatedAt` found 17 duplicate groups / 34 records.
- Each group contains two records with matching service content and different identity fields.
- Existing JSON Car Notes import checked only `idempotencyKey` and `id`, allowing content-identical records with regenerated identities.

## Fix
- Added `_serviceImportFingerprint()` in `modules/shared/backup-restore.js`.
- JSON service import now rejects fingerprints already present in current data and repeated within the same import batch.
- Existing ID/idempotency checks remain intact.
- No backup records are deleted or modified by this patch.

## Validation
- `node --check modules/shared/backup-restore.js` passed.
- Runtime regression/import test should be run in the project harness before release build.
