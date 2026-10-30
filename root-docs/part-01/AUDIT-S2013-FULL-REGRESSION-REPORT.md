# AUDIT S2013 — FULL REGRESSION + BUG-PATTERN HARDENING

Tanggal: 2026-09-25
Basis: `app-main (21).zip` + cumulative S2009-S2012 service patch audit

## 1. Failure inventory

### FAIL-S2012-A — Registry inspect/clean-only interval still created a replacement axis
Status: fixed.

The baseline source still treated a persisted category interval as `replaceKm` even when the canonical maintenance registry defined an inspect-only/clean-only component. This made Reminder read the wrong action axis.

### FAIL-S2012-B — Reminder urgency still hardcoded `periksa` / `ganti`
Status: fixed.

Registry metadata already contains `inspectAction` / `replaceAction`, but baseline urgency candidates were still hardcoded. Canonical registry actions are now propagated into candidate selection and history reset filtering.

### FAIL-S2012-C — Reminder → History routing did not carry both canonical filters
Status: fixed.

Baseline `openHistoryFromReminder()` selected the correct source log but did not always transfer `sessionId/serviceJobId` and `serviceComponentId` into the single History presenter. Both filters are now explicitly set before opening History.

### FAIL-S2013-A — Vehicle-specific interval override could re-create a phantom replacement axis
Status: fixed in this session.

After the S2012 fix, a second equivalent pattern remained: `computeServiceUrgency()` used `getEffectiveIntervalKm()` as a universal replacement override. For a clean-only registry component, a vehicle override therefore moved the override back onto `replaceKm` even though the canonical component had only an inspect/clean axis.

Fix:
- `getMaintenanceSchedule()` now applies a vehicle override to the existing canonical axis: replacement if replacement exists; inspect/clean if inspect-only; legacy unregistered categories retain replacement compatibility.
- `computeServiceUrgency()` consumes the axis-aware schedule rather than reinterpreting the override.
- `buildServiceNextDueSnapshot()` now selects the interval axis using the recorded action and the canonical schedule, preventing saved next-due snapshots from drifting to the wrong axis.

## 2. Regression-pattern audit

Audited classes:
- Component SOT → maintenance registry → interval → Reminder → History.
- `serviceComponentId` / `checklistItemId` identity fallback.
- `sessionId` / `serviceJobId` scope propagation.
- action-aware history reset.
- vehicle interval overrides.
- persisted interval snapshots and next-due projections.
- Service SOT / History ↔ Reminder reconciliation.
- persistence, architecture, PWA recovery, feature wiring, runtime IO, event listeners, patch contamination, reproducible build.
- build/version/cache/bundle freshness and window exposure.

No additional failing product gate was found after the S2013 fix.

## 3. Implementation in one cumulative pass

Changed:
1. `modules/vehicle/sparepart-servis.js`
2. `modules/vehicle/servis.js`
3. Added `tests/service-component-reminder-history-regression-s2012.test.js` with S2012 + S2013 regression cases.
4. Added `scripts/system-integrity-audit.js` to close stale package-script references.
5. Added `scripts/release-gate-closure-audit.js` to close stale package-script references.
6. Regenerated runtime bundles and version/cache artifacts with build `s2013-service-regression-hardening-2007` / cache `2007`.

## 4. Tests

- Full repository: **7,627 PASS / 0 FAIL / 0 cancelled / 0 skipped / 0 todo** across 64 shards.
- S2012/S2013 focused regression: **6/6 PASS**.
- Service SOT integrity: PASS.
- SOT integrity: PASS.
- Architecture integrity: PASS.
- Persistence integrity: PASS.
- PWA recovery: PASS.
- Feature regression: PASS.
- Patch integrity: PASS.
- Patch contamination: PASS.
- Reproducible build: PASS.
- Production readiness: **14/14 PASS**.
- Bundle syntax: PASS.
- Bundle freshness: PASS.
- Window expose: PASS.
- Source-size strict gate: PASS with warning: `modules/vehicle/servis.js` = 1,774 lines, still below the 1,800 guard cap.

## 5. Release environment blockers

The functional and regression suite is green, but the strict production release gate remains blocked by the execution environment:

1. `eslint` is not installed.
2. `esbuild` is not installed; offline installation reports `ENOTCACHED`.
3. Because esbuild is unavailable, the generated bundles are valid but unminified. `app-bundle-b.min.js` remains above the 5 MB performance budget.

These are release-environment/tooling blockers, not a failed product regression.

## 6. Release verdict

**FUNCTIONAL/REGRESSION: PASS.**

**STRICT PRODUCTION RELEASE: BLOCKED** until lint and minification are executed in an environment with the required dependencies, or an explicit release override is intentionally applied.
