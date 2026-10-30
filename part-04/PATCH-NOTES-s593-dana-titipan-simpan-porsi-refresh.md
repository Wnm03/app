# PATCH s593 — Simpan Porsi tidak me-refresh widget Dana Titipan

## Root cause
3 titik "Simpan Porsi" meng-update data (owners, utang titipan, saldo akun)
dengan benar, tapi tidak satupun memanggil render `DanaTitipanPortfolioPresenter`
(kartu "Dana Kelolaan" & tab "Dana Titipan" di dashboard/laporan) — padahal
pola refresh `DanaTitipanPortfolioPresenter.render()` +
`DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList')` sudah jadi
konvensi baku di modul lain (tx-list-cashflow.js, dana-titipan-portfolio-render.js,
titipan-expense-ui.js, investasi-list-view.js, modules-render.js).

## Fix
Ditambahkan 2 baris sync (0 logic baru, reuse fungsi render yang sudah ada)
tepat sebelum toast sukses, di 3 titik:

1. `modules/asset/aset.js` — `Aset.saveOwners()`
2. `modules/asset/investasi-view.js` — `InvestmentUI.saveOwners()`
3. `modules/finance/akun.js` — `AccOwners.save()`

```js
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
```

## Build
- `node scripts/build.js` dijalankan → versi naik ke `s593-ghost-asset-cleanup-owner-settings-buildfix` (build #1328),
  bundle `app-bundle-a.min.js`/`app-bundle-b.min.js` digenerate ulang, versi
  disinkronkan ke semua file sumber (konsekuensi otomatis build.js, bukan
  perubahan manual).
- `node --test tests/*.test.js` → 4176/4176 pass, 0 fail.

## File yang berubah (isi patch ini)
- modules/asset/aset.js (fix)
- modules/asset/investasi-view.js (fix)
- modules/finance/akun.js (fix)
- app-bundle-a.min.js, app-bundle-b.min.js (regenerated, INI YANG DIPAKAI APP)
- index.html, app_production.html, sw.js (version bump ?v=1328 / cache name)
- modules/shared/modules-calc.js, modules/shared/modules-render.js,
  modules/shared/modals.js, modules/shared/features-helpers-global-security.js,
  chat-action-handlers.js (version-string sync otomatis dari build.js — isi
  logic tidak berubah)
- docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md (auto-generated oleh build.js)

Catatan: folder `finance/`, `asset/` di root repo (di luar `modules/`) adalah
duplikat basi yang TIDAK dipakai `scripts/build.js` (sudah dicek terhadap
`SOURCE_FILES` di build.js) — sengaja TIDAK disentuh oleh patch ini.
