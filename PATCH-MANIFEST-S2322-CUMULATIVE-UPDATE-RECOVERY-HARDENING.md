# PATCH S2322 — CUMULATIVE UPDATE / MIGRATION / BOOT RECOVERY HARDENING

Base: `app-main (5).zip`
Previous cumulative: S2321
Build: `s2041-1-part-sot-hardening-2213`
SW cache: `kw-cache-v2213`

## Cumulative scope
- S2320 data-persistence fail-closed protection retained.
- S2321 `init is not defined` bootstrap regression retained/fixed.
- S2322 adds pre-migration checkpoint, future-schema guard, partial-migration rollback protection, runtime upgrade diagnostics, bootstrap watchdog, and scoped SW cache cleanup.
- Regression tests retained and extended.

## Files in cumulative patch
- app-bootstrap.js
- app-bundle-a.min.js
- app-bundle-b.min.js
- app_production.html
- index.html
- sw.js
- modules/shared/app-init-runtime.js
- modules/shared/features-helpers-global-security.js
- modules/shared/modals.js
- modules/shared/modules-render.js
- modules/shared/modules-calc.js
- chat-action-handlers.js
- tests/s2320-persistence-empty-state-protection.test.js
- tests/s2321-app-bootstrap-init-contract.test.js
- tests/s2322-update-recovery-hardening.test.js
- AUDIT-S2321-BOOT-INIT-REGRESSION-AND-PERSISTENCE-CUMULATIVE.md
- AUDIT-S2322-CUMULATIVE-UPDATE-RECOVERY-HARDENING.md
- PATCH-MANIFEST-S2321-CUMULATIVE-BOOT-INIT-PERSISTENCE.md
- PATCH-MANIFEST-S2322-CUMULATIVE-UPDATE-RECOVERY-HARDENING.md

## Safety contract
Never allow an existing installation to boot into an empty/default state when durable storage cannot be read. Never run schema migration without a durable pre-migration checkpoint. Never continue normal boot after a partial migration or future-schema snapshot.

## Final verification
- Selected cumulative tests: 12/12 PASS
- Bundle freshness: PASS
- Persistence gate: PASS
- PWA recovery gate: PASS
- Modified JS/SW syntax: PASS
