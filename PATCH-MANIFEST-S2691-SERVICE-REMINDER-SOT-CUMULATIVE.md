# PATCH MANIFEST — S2691 Service Reminder SOT Cumulative

Baseline: `app-main (28).zip`
Build: `s2033-reset-interval-chain-audit-2593` / `kw-cache-v2593`
Patch is root-relative. Includes cumulative S2690 transaction hardening plus S2691 reminder semantics and regression fixtures.

## Included files
- `AUDIT-S2691-SERVICE-REMINDER-SOT-CUMULATIVE.md`
- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `app_production.html`
- `chat-action-handlers.js`
- `docs/COVERAGE-PER-MODULE.md`
- `docs/FILE-MAP.md`
- `index.html`
- `modules/shared/features-helpers-global-security.js`
- `modules/shared/modals.js`
- `modules/shared/modules-calc.js`
- `modules/shared/modules-render.js`
- `modules/vehicle/servis.js`
- `modules/vehicle/sparepart-servis.js`
- `modules/vehicle/vehicle-core.js`
- `sw.js`
- `tests/service-date-boundary-p20.test.js`
- `tests/service-hardening-v28.test.js`
- `tests/service-legacy-migration-p13.test.js`
- `tests/service-maintenance-rules-v2-action-aware.test.js`
- `tests/service-maintenance-rules-v3-time-axis.test.js`
- `tests/service-reminder-transaction-hardening-s2690.test.js`
- `tests/servis-actiontype-resettype-sesi1.test.js`

## Validation
- Related regression command: 1,675 passed, 0 failed, 0 skipped.
- Focused semantic/transaction/dashboard rerun: 47 passed, 0 failed.
- Production build and bundle freshness: PASS.
- Full `npm test`: BLOCKED by 300-second timeout.
- Service SOT gate: BLOCKED by 90-second timeout.
- ZERO GAP is not claimed.
