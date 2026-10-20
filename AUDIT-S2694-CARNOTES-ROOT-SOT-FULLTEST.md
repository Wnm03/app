# Audit S2694 — CarNotes Root SOT + Full Test Closure

## Baseline and scope
- Baseline: `app-main (31).zip`
- Accumulates the S2692/S2693 root SOT and filter fixes; patch contains changed files only.
- Focus: reminder status must derive from the canonical service urgency function; missing/invalid baseline must remain unknown rather than manufacturing a 0-km baseline; filter groups must reconcile to all reminders; history action evidence must be explicit and component-scoped.

## Root-cause regression found during full-test
Shard 24 exposed three failing legacy expectations in `tests/sparepart-interval-bulan.test.js`. The fixtures supplied a history row with date/km but no `actionType`, while the canonical reminder path requires explicit reset-action evidence (`ganti`) to establish a valid replacement baseline. The old fixtures implicitly assumed any category-linked history row resets the interval, which conflicts with the component/action-scoped SOT contract and can reintroduce false baselines.

Fix: update the three test fixtures to include `actionType: 'ganti'`. Production logic is unchanged in this iteration; the test data now states the actual evidence required by the SOT contract. The focused test file passes 11/11.

## Validation
- Full test runner: **8,983 tests; 8,982 passed; 0 failed; 0 cancelled; 1 skipped; 0 todo**.
- All 32 shard checkpoints validated against the same current test manifest.
- Service SOT structural integrity gate: **PASS** (category/master mapping, 102/102 checklist mapping, brake/action contract, interval SOT, service-event idempotency, history↔reminder reconciliation, same service-log fact, vehicle isolation, and full regression contract).
- Shard 24 initially failed 3 assertions because fixture rows omitted `actionType`; after correcting the fixtures, shard 24 passed 251/251.
- Production source and bundles were unchanged in this iteration; the existing S2693 production artifacts remain included in the cumulative patch. A fresh minifier build was not rerun because the environment's esbuild binary returned `EACCES`; this does not invalidate the completed source/test full-suite results but is recorded as a deployment/build limitation.

## Remaining limitations
- The automated full test and structural SOT gate pass, but this is not a claim that every real-device runtime state has been visually verified. Runtime confirmation should still check the user's actual 40 reminders and ensure the visible bucket counts sum to 40, including `Belum diketahui`.
- Do not overwrite live vehicle/service history data while applying this patch.
