# PATCH-MANIFEST-S2535 — accumulated non-SOT N5 closure

Baseline: `app-main (14)` + cumulative S2532/S2533/S2534 non-SOT lineage.
Parent: S2534 NON-SOT FOLLOW-UP.

## N5 closure

Audit the seven legacy dashboard renderers that had no current DOM target:
- Retired safely: `renderDashCashflowForecast`, `renderDashboardBills`, `renderDashboardBackupReminder`, `renderDashLaporanMini`.
- Retained intentionally: `renderDashboardServisReminder`, `renderDashboardSewaKiosReminder`, `renderDashAccList` because live production callers still exist.
- `dismissBackupReminder` was also retired because its only target/handler belonged to the retired backup card.

No SOT/schema/financial formula/writer/persistence/atomicity/product rule was changed.

## Verification
- N5 audit behavior/dependency gate: 2/2 PASS.
- S1843 regression: PASS.
- S698 legacy renderer retirement regression: PASS.
- JS syntax on changed JS: PASS.
- Full suite/minified production build: not claimed here.
