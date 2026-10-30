# Patch S1862 — Release Version + S1828 Import Idempotency Regression Fix

## Scope

This cumulative patch fixes the five regressions found when the cumulative patch was run against the full 7,124-test suite.

### 1. Canonical release version

Changed the canonical release version from the non-conforming label:

`sa-i-cumulative-audit-20260923`

to the repository session convention:

` s1862-sa-i-cumulative-audit-1828 `

The value is synchronized across the canonical source, derived runtime constants, HTML cache-bust parameters, bundles, and Service Worker cache name.

Cache-bust is now `?v=1828` and Service Worker cache is `kw-cache-v1828`.

### 2. S1828 assertion contract

SA-H intentionally strengthened import idempotency so a transaction key is deduplicated both against persisted transactions and against keys already accepted earlier in the same import batch.

The S1828 test now asserts the stronger contract:

- `existingKeys` is populated from persisted transactions;
- `acceptedKeys` tracks keys accepted during the current batch;
- a key is rejected when it exists in either set;
- accepted keys are added to `acceptedKeys`.

The behavior is not weakened to restore the obsolete single-set assertion.

### 3. Build artifacts

Old `backups/` build artifacts are excluded from this deployment patch. They are historical build outputs, not runtime files.

## Verification

Targeted regression tests covering S1828, SA-H, and SA-L pass. The full suite should be rerun on the complete baseline + cumulative patch because this patch is distributed as an overlay rather than a standalone repository.
