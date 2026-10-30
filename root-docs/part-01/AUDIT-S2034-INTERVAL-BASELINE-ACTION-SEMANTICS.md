# S2034 — Interval Baseline Must Follow the Last Resetting Service Action

## Root cause
`buildServiceNextDueSnapshot()` could derive `nextDueKm`/`nextDueDate` from the current event for actions such as `bersih` or `periksa`. That incorrectly made a cleaning or a good-condition inspection appear to restart a component's replacement interval, even though the reminder projection used the replacement history axis.

## Change
- A non-reset action (`periksa`, `bersih`, `setel`, or an unrecognized non-reset action) now reuses the latest history row that resets the replacement interval.
- Replacement-family actions (`ganti`, `pasang`, `pasang baru`, `overhaul`/repair aliases) still establish a new baseline.
- Explicit inspection/cleaning-only schedules retain their own inspection axis; their interval continues to be measured from the relevant inspection action.
- If no applicable reset history exists, the non-reset event does not invent a new replacement due point.
- No historical service records are rewritten.

## Regression coverage
`tests/service-reminder-interval-baseline-s2034.test.js` verifies that cleaning and a good inspection preserve the last replacement's due odometer, while a new replacement moves the due odometer forward.

## Validation
- Targeted interval/reset/clean-only tests: 16/16 PASS.
- `node scripts/verify-bundle-freshness.js`: PASS for bundles A and B.
- `node scripts/verify-window-expose.js`: PASS (83 modules).
- Build: PASS with required esbuild minification; synchronized runtime version `s2033-reset-interval-chain-audit-2554`, HTML cache busts and service-worker cache `kw-cache-v2554`.
- Full repository suite: not claimed by this focused validation report.
