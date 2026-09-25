# S2013 — Service Regression Hardening (Cumulative)

Basis: `app-main (21)` + S2009-S2012 cumulative service fixes.

## Fixes
- Component SOT maintenance registry now preserves inspect/clean-only intervals on the inspect axis.
- Reminder urgency uses canonical `inspectAction` / `replaceAction` metadata.
- Reminder → History carries canonical session + component filters.
- Vehicle-specific interval overrides now remain on the canonical maintenance axis instead of creating a phantom replacement axis.
- Next-due snapshots follow the canonical action/axis.
- Added regression coverage for persisted intervals, component History focus, vehicle overrides, and next-due snapshots.
- Closed stale package-script references for system-integrity and release-closure audits.

## Verification
- Full repository: 7,627 PASS / 0 FAIL.
- Focused S2012/S2013: 6/6 PASS.
- Service SOT integrity: PASS.
- Reproducible build: PASS.
- Production readiness: 14/14 PASS.
- Strict release remains environment-blocked by missing eslint/esbuild; no production ZIP should be treated as strictly release-cleared until those gates run.
