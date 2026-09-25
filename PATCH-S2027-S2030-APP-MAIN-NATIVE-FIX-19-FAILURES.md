# PATCH S2027-S2030 — APP MAIN Native Compatibility Fix

## Tujuan

Patch ini melengkapi APP MAIN baseline tanpa membawa runtime Service History historis S2014-S2030 yang tidak kompatibel dengan native Service SOT APP MAIN.

## Akar 19 failure

19 failure muncul ketika cumulative S2009-S2030 lama di-overlay ke APP MAIN. Kontrak lama mengharapkan `servis.js`, cache/version, dan context/evidence modules lama, sedangkan APP MAIN sudah memiliki native Service SOT (`service-event-sot.js`, `service-session-sot.js`, `service-history-sot-normalizer.js`, `service-history-reminder-reconciliation-sot.js`, `service-history-audit-package.js`, dan lainnya).

Jadi fix-nya adalah **compatibility projection**, bukan mengganti native runtime.

## Perubahan

Tambahan:

- `modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js`
- `tests/service-history-lifecycle-s2027-s2030-app-main.test.js`

Projection bersifat read-only dan menggunakan SOT APP MAIN yang sudah ada untuk:

- history identity
- vehicle scope
- component context
- session context
- reminder/history reconciliation
- reload normalization
- Service Event integrity
- audit-package integrity
- immutability

## Yang sengaja TIDAK diubah

- `modules/vehicle/servis.js`
- `modules/vehicle/servis-b.js`
- Service SOT native APP MAIN
- `index.html`
- `app_production.html`
- `sw.js`
- production bundles
- persistence/schema
- finance/transaction data

## Hasil

Patch ini dapat di-upload manual ke repository di atas APP MAIN baseline. Tidak ada full-release archive di patch ini.
