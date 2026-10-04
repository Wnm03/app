# S2466 — Finance Account Delete Atomicity

## Scope
Deep audit of Finance account deletion and cross-domain accountId migration.

## Finding
Account deletion could mutate the account collection and linked transaction/bill/domain references before `save()` rejection, leaving an in-memory partial mutation. Bill migration also bypassed the canonical Bill/Debt/Piutang writer.

## Fix
- stale-state preflight before mutation;
- snapshot all migrated domains;
- transaction migration through FinanceTxSOT;
- bill migration through BillDebtPiutangCanonicalWriter;
- rollback every migrated domain when persistence or migration fails;
- reject deletion when canonical bill writer is unavailable.

## Validation
- S2466 targeted: 2/2 PASS.
- Finance cumulative regression boundary: 44/44 PASS in fresh replay.

## Scope verdict
No additional substantive gap identified in the audited account-delete boundary after S2466.
