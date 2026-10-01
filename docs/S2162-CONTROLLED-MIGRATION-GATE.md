# S2162 — Controlled Existing-Data Migration Gate

S2162 hardens S2161 so existing service-data normalization is **audit-first, deterministic-only, idempotent, vehicle-bound, and non-destructive**.

## Rules
- Only records classified `safe` by S2161 may be applied.
- `unresolved`, `conflict`, and `blocked` records are never auto-migrated.
- Existing legacy fields are retained.
- Canonical IDs are not replaced by guesses.
- Migration is idempotent: a second pass must change zero records.
- Vehicle identity must already exist before a service record can be migrated.
- Service history remains owned by `D.servisLogs`; S2162 creates no fact store.
- S2161 `editHistory` is the audit trail for service-record changes.

## Operational sequence
1. Run S2161 audit.
2. Review counts and deterministic mapping report.
3. Apply only `safe` records.
4. Re-run S2161 and require `changed=0` on the second pass.
5. Run the full regression/gate chain.
6. Do not auto-resolve the remaining ambiguous records without an explicit canonical mapping.

## Scope
S2162 is a guard/gate, not a destructive data migration. Production execution must still use a current user-data backup and a validated mapping report.
