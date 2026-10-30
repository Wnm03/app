# S2306 — Cross-Domain Lexical-D Gap Sweep

## Trigger
User-visible Finance `markBillPaid` failure: `FinanceCrossEntityAtomic: D belum tersedia`.

## Root cause class
Browser application state `D` is a top-level lexical binding. `let D` is not automatically `globalThis.D`. Runtime modules that read only `g.D` can therefore fail even though lexical `D` exists.

## Fixed production boundaries
Finance (from S2305 carried forward):
- modules/finance/finance-tx-sot.js
- modules/finance/finance-cross-entity-atomic.js
- app-bundle-a.min.js mirror

Vehicle/Service S2306:
- modules/vehicle/service-event-sot.js
- modules/vehicle/service-session-mutation-s2047.js
- modules/vehicle/service-session-recovery-s2050.js
- modules/vehicle/service-session-reconcile-s2051.js
- modules/vehicle/service-history-checklist-edit-s2036.js
- modules/vehicle/service-reminder-package-sot.js
- modules/vehicle/service-session-integrity-s2045.js
- app-bundle-b.min.js mirror

All use a lexical-D-first resolver with globalThis fallback.

## Regression
Targeted accumulated regression: **41/41 PASS**.
Coverage includes:
- Service Event S1946-S1953
- Service History/Car Notes S2027-S2030
- Service Session S2047-S2049
- Car Notes S2053
- Reminder package S1944/S1945/S1955
- Service Session Integrity S2045
- S2154-S2159 SOT consolidation
- Stock S2152 P4.1-P4.4
- S2306 lexical-D browser-shape tests

One stale S2036 source-contract test expected the old `g.D.servisLogs.push(owner)` spelling. It was reconciled to the new resolver contract; no behavioral expectation changed.

## Static gap sweep
Critical SOTs now have no direct `g.D` access outside their explicit lexical-D fallback helper.
Historical/read-only Service audit modules with direct `g.D` were not mass-refactored because they are not mutation authorities and doing so would exceed evidence-backed scope.

## Full suite
The full runner did not complete within the 120-second environment limit. Therefore no full-suite PASS claim is made.

## Separate known release blockers
S2302 version synchronization, Bundle-B freshness/budget, and unavailable production minification toolchain remain separate from this S2306 bug fix.

## Status
**CLOSED — targeted bug-gap hardening with accumulated regression evidence.**
