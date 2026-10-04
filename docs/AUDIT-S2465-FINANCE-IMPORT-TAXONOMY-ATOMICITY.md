# Audit S2465 — Finance Import Taxonomy Atomicity

## Finding
Cashew CSV import created accounts/categories/subcategories before transaction deduplication, user confirmation, stale-write preflight, and persistence. A failed/cancelled/stale/duplicate-only import could therefore leave Finance taxonomy mutated without a committed transaction import.

## Repair
- Snapshot `D.accounts` and `D.categories` before Cashew taxonomy discovery.
- Restore the snapshot when deduplication yields zero new transactions.
- Restore on user cancellation and stale-state rejection.
- Restore on transaction persistence failure together with the transaction snapshot.
- Successful import commits taxonomy and transactions together through the existing `save()` boundary.

## Validation
- S2464 + S2465 targeted tests PASS.
- Fresh cumulative replay and system/app-wide/SOT gates must remain green before closure.

## Scope verdict
The identified Finance import taxonomy atomicity gap is repaired. No claim of global application zero-gap is made until remaining release/domain audits and release closure are complete.
