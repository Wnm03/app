# S2307 — Service / Car Notes SOT Bypass & Legacy-Path Audit

## Scope
Audit regression and legacy-data routing from baseline `app-main (49)+S2304+S2305+S2306`.

## Findings

### Canonical service history
`D.servisLogs` is NOT a legacy datastore. The current architecture explicitly
defines it as the canonical storage owner for service history, with
`ServiceEventSOT` acting as canonical normalization/projection/validation.
Direct array access inside the service domain is therefore not by itself a
legacy bypass.

### Legacy interval migration
The S2163-S2167 gates confirm the reviewed migration/compatibility model:
- S2163 legacy mapping: PASS 8/8
- S2164 reviewed mapping: PASS 10/10
- S2165 post-migration reconciliation: PASS
- S2166 runtime projection sync: PASS
- S2167 production runtime wiring: PASS
- S2160 SOT drift/orphan: PASS 6/6
- S2154-S2159 consolidation: PASS 6/6

Legacy interval fields remain only where required for migration/compatibility
and are not recreated as the runtime authority.

### Finance transaction fallbacks
Several modules retain `FinanceTxSOT -> D.transactions` fallback branches.
Build ordering places `finance-tx-sot.js` in the canonical bundle before active
consumers, so no production runtime failure was proven from these branches.
Recovery/import code is intentionally allowed to operate on raw snapshots.

No broad removal was made because doing so would risk breaking isolated
harnesses and recovery/import compatibility without evidence of a production
bug.

### Regression contract gap found
`tests/service-session-recovery-s2050.test.js` still asserted the old source
shape `g.D.servisLogs / g.D.transactions / g.D.partsStock`.

Current S2050 correctly uses the hardened resolver:
`const data=()=>typeof D!=='undefined'?D:g.D`.

Action: update the test contract to assert the resolver and `data()` accesses.

## Regression

Targeted S2307 matrix:
- 52/52 PASS after contract reconciliation.

The previous 51/52 result was one stale source-contract assertion, not a
runtime regression.

## Production changes

Production logic: **0**
Schema: **0**
Persistence schema: **0**
UI: **0**
New feature: **0**

## Status

**CLOSED — no proven active legacy datastore path; one stale regression
contract reconciled.**
