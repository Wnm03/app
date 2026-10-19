# Audit & Patch Report S2691 — Service Reminder SOT (Cumulative)

## Identity
- Baseline repository: `app-main (28).zip`
- Package version: `keluarga-w@0.85.10`
- Build version after patch: `s2033-reset-interval-chain-audit-2593`
- Cache key: `kw-cache-v2593`
- Scope: cumulative Service Reminder / Service History hardening; prior S2690 transaction hardening retained.
- User data: no runtime user data or historical service event was edited by this patch/build process.

## Changes in this accumulation
1. Missing/blank legacy `actionType` normalizes to `unknown`, not `ganti`. An ambiguous event is not replacement evidence.
2. `computeServiceUrgency()` no longer turns unknown current odometer into `0 km` for interval calculations.
3. No replacement/inspection baseline means countdown is `unknown`, not an invented baseline at zero.
4. Replacement events whose recorded KM exceeds a known active odometer are excluded from the candidate baseline. If no valid baseline remains, projection is unknown.
5. Status boundary is consistent: negative remaining interval => `terlewat`/late; exactly zero => `jatuh_tempo`; missing score => `unknown`.
6. Dashboard reminder preserves the SOT's `unknown` projection and displays “Baseline servis belum diketahui” instead of rebuilding a fake countdown or silently hiding the reminder.
7. Updated regression fixtures to state explicit `ganti` where the test is specifically about valid replacement snapshots, and to expect unknown where legacy action evidence is missing.
8. Retained S2690 mutation hardening: stock mutation rollback boundary, save rejection handling, and guard cleanup.
9. Rebuilt production bundles, HTML cache versions, service worker cache, generated file map and module coverage.

## Evidence / tests
### Passed
- `node --test tests/service-reminder-transaction-hardening-s2690.test.js tests/service-reminder-interval-baseline-s2034.test.js tests/service-reminder-reset-action-contract-s2031.test.js tests/service-reminder-reset-action-s2033-regression.test.js tests/service-reminder-roundtrip-s2056-s2059.test.js tests/service-maintenance-reminder-projection-v8.test.js`: 37/37 passed before the later dashboard/status fixture updates; bundle projection test also passed after build.
- Focused follow-up: `node --test tests/service-date-boundary-p20.test.js tests/service-legacy-migration-p13.test.js tests/service-maintenance-rules-v2-action-aware.test.js tests/service-maintenance-rules-v3-time-axis.test.js tests/servis-actiontype-resettype-sesi1.test.js tests/servis-mastercategory-dashbadge-sesi-d-lanjutan1.test.js tests/service-reminder-transaction-hardening-s2690.test.js`: 47/47 passed.
- Related regression command: `node --test tests/*service*.test.js tests/*servis*.test.js tests/*reminder*.test.js tests/*vehicle*.test.js`: 1,675 tests passed, 0 failed, 0 skipped.
- `node scripts/build.js --require-minify`: PASS; build version 2593, HTML and service-worker cache synchronized; both bundles pass `node --check`.
- `node scripts/verify-bundle-freshness.js`: PASS; bundle A source hash `5eaa2fcc6385380e`, bundle B source hash `c912b9252bfc3f2e`.
- Focused test rerun after build: service date boundaries, legacy migration, v2/v3 rule axes, action reset semantics, dashboard reminder, and S2690/S2691 hardening: 47/47 passed.

### Blocked / not passed
- `npm test` was attempted with a 300-second timeout; the process did not complete. Output reached approximately test 2,200 before timeout, so this is not a full-suite PASS.
- `node scripts/service-sot-integrity-gate.js` timed out at 90 seconds. The service-SOT gate is BLOCKED, not PASS.
- `npm run release-check`, `npm run lint`, `npm run test:full`, and production browser E2E were not completed in this accumulation.

## Remaining correctness boundary
- The global `save()` API rejects synchronously in known recovery/cross-tab stale cases (`false`) but normally schedules debounced persistence and returns no durable commit acknowledgement. S2690 callers fail closed on an explicit `false`; asynchronous IndexedDB/localStorage durability acknowledgement remains a residual design risk and is not claimed closed by this patch.
- Legacy rows with missing action type are now treated as ambiguous for reminder interval reset. The patch does not invent historical action data or rewrite those rows into `ganti`.
- Unknown baseline status is deliberately visible in the dashboard. It is not treated as “safe” or as a numeric countdown.

## Exit gate
- Targeted service/reminder regression: PASS (1,675 tests across the related-file command).
- Production build and bundle freshness: PASS.
- Full suite: BLOCKED (timeout).
- Service SOT gate: BLOCKED (timeout).
- Release gate / lint / browser E2E: BLOCKED (not completed).
- ZERO SUBSTANTIVE GAPS: NOT CLAIMED.
