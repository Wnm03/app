# S2171 — Controlled Service Backup Migration

## Scope and safety

S2171 adds an operator-run migration harness; it does not run automatically during app startup or restore. Preview is the default. Applying requires all of: `--apply`, an exact `--expected-sha256` for the source file, and a distinct new `--output` path. Existing outputs are never overwritten. The source backup is never written. On apply, the exact source bytes are written to `<output>.rollback.json` before the new copy is created.

Only S2164 rows explicitly marked `reviewed:true` and passing vehicle-boundary/conflict checks are applied. S2161 ambiguous rows, category-reference conflicts, and root-vs-checklist action conflicts are not silently corrected.

## Real backup verification

Input: `backup-keluarga-W-2026-10-18.json` (uploaded backup copy)

- Source SHA-256: `4d73853b57b0df1d22e218dce839440cef210e3877b7d751d6dd4a0ecedcfb31`
- History rows: 110; checklist rows: 83.
- S2161 before: 90 clean, 0 safe, 20 unresolved.
- S2164 before: 9 reviewed matches, 5 safe, 4 already clean.
- Applied to a separate output copy: 5 reviewed mappings, zero other changes by this migration.
- S2161 after: 95 clean, 15 unresolved; no unresolved row was auto-fixed.
- S2164 after: 9 clean, 0 safe; second pass changed 0 (idempotent).
- Source SHA remains unchanged; original bytes are preserved in the rollback sidecar.

The 5 deterministic mappings include the exact reviewed Slidepiece → `servis-cvt` / `slide-piece-cvt` mapping. The output copy is diagnostic/controlled migration output, not a replacement for the user's active data. User should inspect the report and validate in-app restore/reminder behavior before choosing to use it.

## Remaining blockers

S2170 found 11 cross-vehicle category references, 11 duplicate category-ID references, and 22 root/checklist action-authority conflicts. Counts overlap. These are not safe to fix from identity mapping alone. S2171 does not touch those fields. Fifteen service history rows remain unresolved after applying the five reviewed mappings; these require additional evidence or explicit user review.

## CLI

Preview only:

```bash
node scripts/s2171-controlled-service-backup-migration.js backup.json --report s2171-preview.json
```

Apply only to a new copy (replace the hash with the exact hash printed by preview):

```bash
node scripts/s2171-controlled-service-backup-migration.js backup.json --apply --expected-sha256 <exact-sha256> --output backup-migrated.json --report s2171-apply-report.json
```

## Validation

S2171 tests verify source immutability, unresolved-row preservation, exact SHA guard, separate output, rollback sidecar, and idempotence. Targeted reconciliation tests passed. A complete app-wide test suite was not claimed for this S2171 change because the previous full-suite run in this environment timed out; no runtime application source or production bundle was changed in S2171.
