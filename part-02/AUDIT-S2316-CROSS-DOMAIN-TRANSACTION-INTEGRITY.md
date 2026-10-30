# S2316 — Cross-domain Transaction Integrity Audit

## Status
**OPEN / EVIDENCE GAP — no production change**

## Scope

Verify that transactions crossing domain boundaries retain a single canonical
finance identity and that linked domain records do not silently diverge.

Domains considered:
- Finance transactions ↔ Account
- Service ↔ Finance
- Fuel/BBM ↔ Finance
- Asset ↔ Finance
- Investment ↔ Finance
- Vehicle ↔ Finance
- Shop/Inventory ↔ Finance
- Dana Titipan / talangan ↔ Finance
- Renov ↔ Finance

## Evidence found

### Service / Vehicle
Repository evidence shows service records carry a `txLinkId`, while the
corresponding finance record carries `servisLinkId`. The service flow also
updates/reuses the linked transaction when editing.

This establishes an explicit bidirectional linkage pattern, but static search
results alone do not prove every mutation path is atomic.

### BBM / Vehicle
Repository evidence shows BBM records carry `txLinkId` and finance records
carry `bbmLinkId`. Edit/delete paths attempt to synchronize the linked finance
record.

Again, this is linkage evidence, not proof of complete atomicity.

### Dana Titipan
Existing Dana Titipan design/audit documentation identifies `titipanLinkId`
as the transaction-to-owner linkage and `titipanTalangan` as the talangan
state. Existing lifecycle helpers include creation/synchronization of the
related piutang.

### Finance SOT
Earlier S2305/S2309 work established `FinanceTxSOT` as the intended canonical
transaction write boundary for hardened paths. However, current Library search
also surfaced older source snapshots containing direct `D.transactions.push()`
patterns in Car Notes. Because those files are not proven to be the current
S2309+ working tree, this evidence is **not sufficient to declare a live
production bypass**.

## Integrity matrix

| Boundary | Linkage evidence | Atomicity freshly verified | Status |
|---|---:|---:|---|
| Account ↔ Finance | Present | Not executed here | OPEN |
| Service ↔ Finance | Present | Not executed here | OPEN |
| BBM ↔ Finance | Present | Not executed here | OPEN |
| Asset ↔ Finance | Partial/needs current-source verification | No | OPEN |
| Investment ↔ Finance | Partial/needs current-source verification | No | OPEN |
| Vehicle ↔ Finance | Present through service/BBM paths | No | OPEN |
| Shop ↔ Finance | Existing integration documented | No | OPEN |
| Titipan ↔ Finance | `titipanLinkId` / talangan linkage documented | No | OPEN |
| Renov ↔ Finance | Needs current-source verification | No | OPEN |

## Required S2316 tests

1. Create one domain record with linked transaction.
2. Verify exactly one finance transaction is created.
3. Edit the domain record; verify the same transaction identity is updated,
   not duplicated.
4. Delete the domain record; verify the linked transaction follows the
   documented deletion contract.
5. Simulate a failure between the two writes; verify rollback/atomicity.
6. Repeat the same operation/idempotency key; verify no duplicate transaction.
7. Verify account balance/projection changes exactly once.
8. Verify cross-domain links do not point to missing IDs.
9. Verify multi-owner/titipan split creates the documented number of
   transactions and preserves owner linkage.
10. Repeat the matrix after reload/persistence.

## Important finding

No new transaction engine should be introduced by this audit.

The project already has Finance SOT / atomicity primitives from prior sessions.
The correct action is to verify all consumers use those primitives and to
distinguish genuinely current source from stale Library snapshots before making
any code change.

## Verdict

**S2316 = OPEN / EVIDENCE GAP.**

No active production defect is asserted from the available evidence.
No production/schema/UI/persistence/SW code was changed.

## Delta

- Production: 0
- Schema: 0
- Persistence: 0
- UI: 0
- Service worker: 0
- Tests: 0
- Audit documentation: 1
