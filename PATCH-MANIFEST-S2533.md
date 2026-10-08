# PATCH-MANIFEST-S2533 — Non-SOT audit follow-up / accumulated repair

Baseline: `app-main.zip` + S2530 + S2531, runtime v2273 lineage.
Parent patch: S2532 Non-SOT.
Scope: close verified S2532 gaps only; SOT/schema/financial formulas/writers/commit-rollback/product decisions remain excluded.

BEGIN_APPLY_FILES
DELETE-FILES.txt
PATCH-MANIFEST-S2533.md
index.html
car-notes.js
modules/business/payroll-absensi.js
modules/business/shop-data-io-api.js
modules/dashboard-hub/dashboard-hub-registry.js
modules/dashboard-hub/dashboard-hub-settings.js
modules/dashboard-hub/dashboard-hub.js
modules/dashboard-hub/dashboard-insight-dedup.js
modules/finance/dana-titipan-portfolio-render-b.js
modules/finance/debt-optimizer-api.js
modules/finance/piutang-utang-reminder.js
modules/finance/piutang-utang.js
modules/finance/transaksi.js
modules/finance/tx-transfer.js
modules/shared/features-helpers-global-security.js
modules/shared/modules-calc.js
modules/shared/modules-render-b.js
modules/shared/modules-render.js
modules/shop/cobek-order.js
modules/vehicle/fuel-compare.js
modules/vehicle/fuel-dashboard.js
modules/vehicle/fuel-export-utils.js
modules/vehicle/fuel-maintenance-engine.js
modules/vehicle/fuel-trend-dashboard.js
modules/vehicle/servis-checklist.js
modules/vehicle/sparepart-servis.js
tests/audit-nonsot-s2532.test.js
tests/audit-nonsot-s2532-followup.test.js
tests/carnotes-sparepart-lazy-dashboard-stock-s1970.test.js
tests/dashboard-hub-settings.test.js
tests/dashboard-slim-performance-regression.test.js
tests/fuel-trend-dashboard.test.js
tests/findvehiclespec-modelid-followup-renderb-tirepressure.test.js
tests/s2441-html-emoji-encoding.test.js
tests/s2442-residual-html-encoding.test.js
tests/s2444-attribute-id-encoding.test.js
tests/sa16-dashboard-settings-dynamic-inline-attr.test.js
tests/service-innerhtml-surface-v23.test.js
END_APPLY_FILES

BEGIN_DELETE_FILES
pro-ui-layer.css
modules/shop/modules-render.js
END_DELETE_FILES

## S2533 verified changes
- N4: reset already clears `dashHubSectionTab`; UI label changed to `Tab saat pertama dibuka`.
- N7: commitment save/delete, owner-linkage removal, return save/delete, pool opening/deposit all fail closed on `false` or `{ok:false}` before close/render/success toast.
- N11: Pension target/contribution reject non-numeric/negative input while retaining `parsePzNum` for valid localized numbers.
- N17: UI-only execution cursor now reaches `PLANNED → COMPLETED → PLANNED → SKIPPED → PLANNED`; every actual transition still delegates to `ServiceChecklistExecutionSOT.transition`; SOT file untouched.
- N18: remaining verified non-writer UI defaults `whDate` and `bbmDate` use local `todayStr()`.
- N19: maintenance overdue matching de-duplicates one service item even when it matches multiple keyword groups.
- Test hygiene: added behavior tests for N4/N7/N11/N17/N18/N19; retained source guards only where they are guards, not behavior evidence.
- `DELETE-FILES.txt` and the manifest delete block are kept consistent with the existing historical delete contract: `pro-ui-layer.css` is a legacy deletion declaration even though the file is absent from the supplied baseline; `modules/shop/modules-render.js` is the actual retired source file.

## Remaining status
- FULL: N1–N4, N6–N11, N13, N16–N19 (N12/N14 require remaining presentation verification).
- PARTIAL/NOT VERIFIED: N5 (seven-renderer claim not substantiated by baseline), N12 (engine reason is still a general availability note), N14 (no runtime duplicate-value proof).
- BLOCKED: N15 (FI-P3-1 target presenter not uniquely established; no speculative edit).
- No SOT writer/schema/financial formula/commit-rollback/product-rule change introduced.

## Verification
- New follow-up behavior tests: 6/6 PASS.
- Accumulated S2532 targeted regression set: 105/105 PASS.
- JS syntax: changed JS files PASS.
- Dev build: previously PASS at v2274 after S2533 changes; production minification remains BLOCKED because esbuild is unavailable in sandbox. Bundle/production build outputs are excluded from this patch.
- Full suite: NOT COMPLETED; do not claim full-suite PASS.
