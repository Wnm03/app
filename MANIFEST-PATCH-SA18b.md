# PATCH KUMULATIF — SA18b (basis v1591 → v1600)

ZIP ini **hanya berisi file yang berubah** (bukan full release project) —
sesuai gaya "1 sesi 1 zip" yang biasa dipakai proyek ini. Timpa semua file
di dalamnya ke lokasi yang sama persis di project asli (basis v1591, yaitu
project awal sebelum SA11-SA18).

Semua isi ZIP ini sudah diverifikasi PENUH di proyek asli: full test suite
5812/5812 pass, `node scripts/build.js` sungguhan dijalankan (bukan ditulis
manual), release gate lolos (override lint/minify — sandbox tanpa jaringan,
override ke-11 berturut-turut untuk gate yang sama). Detail lengkap ada di
`SESSION-NOTE-SA18b-dana-titipan-portfolio-dynamic-inline-attr.md`.

## Isi & alasan tiap file disertakan

**Source (perbaikan BARU sesi ini):**
- `modules/finance/dana-titipan-portfolio-render.js` — SA18b, 5 titik
  migrasi inline→data-action/data-onchange di `_renderFilterBar()`
  (2x tombol Pilih Semua/Bersihkan, 1x checkbox owner, 1x select Status)
  + `_ownerCardHtml()` (1x select "Pilih Aset", token `$el`)
- `modules/finance/dana-titipan-portfolio-render-b.js` — SA18b, tambah
  `window.DanaTitipanPortfolioPresenter = ...` (temuan tambahan: gate
  verify-window-expose.js mewajibkan window-expose begitu modul dipakai
  lewat `data-action`, sebelumnya luput karena cuma onclick/onchange inline)

**Source (dari sesi sebelumnya, TIDAK diubah lagi — ikut karena basis ZIP
tetap v1591):**
- `modules/asset/aset-reports.js` (SA18a)
- `modules/asset/aset.js` (SA14b), `modules/asset/investasi-list-view.js` (SA14a)
- `modules/asset/aset-owners.js` (SA11), `modules/asset/investasi-view.js` (SA12)
- `modules/finance/akun.js` (SA13), `modules/finance/cashflow-projection-presenter.js` (SA17)
- `modules/business/shop-pdf-import-ui.js`, `modules/business/shop-scan-ui.js` (SA15)
- `modules/vehicle/vehicle-catalog-import-ui.js`, `modules/vehicle/honda-pdf-import-ui.js`,
  `modules/vehicle/vehicle-catalog-web-import-ui.js` (SA15)
- `modules/dashboard-hub/dashboard-hub-settings.js`, `modules/modules-render.js`,
  `modules/shop/modules-render.js` (SA16)
- `modules/vehicle/fuel-price-ref.js`, `modules/shared/modals.js` (sesi fuel-price-ref)

**Version-sync (otomatis, ikut berubah tiap `node scripts/build.js`):**
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` — hanya konstanta versi
  (`APP_BUILD_VERSION` dkk) yang berubah, 0 logic.

**Test (baru SA18b):**
- `tests/sa18b-dana-titipan-portfolio-dynamic-inline-attr.test.js` (13 test)

**Test (fix regresi SA18b — sinkron ke markup baru, 0 perubahan makna):**
- `tests/s633-titipan-linkasset-toggle-collapsed.test.js`
- `tests/s668-dana-titipan-owner-status-filter.test.js`

**Test (dari sesi sebelumnya, TIDAK diubah lagi):**
- `tests/sa18a-aset-reports-penyusutan-dynamic-inline-attr.test.js` (SA18a)
- `tests/aset-dynamic-inline-attr-sa14b.test.js`,
  `tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js`,
  `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js`,
  `tests/s667-aset-owner-status-filter.test.js`,
  `tests/s669-investmentlistui-multiselect-owner-filter.test.js`,
  `tests/s671-investmentlistui-filter-select-all-clear.test.js` (SA14a/SA14b)
- `tests/aset-owners-dynamic-inline-attr-sa11.test.js`,
  `tests/asset-owners-flow-e2e-392a-to-392e.test.js` (SA11)
- `tests/investasi-view-dynamic-inline-attr-sa12.test.js`,
  `tests/s552-investment-owners-nominal-bidirectional.test.js` (SA12)
- `tests/akun-accowners-dynamic-inline-attr-sa13.test.js` (SA13)
- `tests/sa15-import-preview-dynamic-inline-attr.test.js` (SA15)
- `tests/sa16-dashboard-settings-dynamic-inline-attr.test.js`,
  `tests/dashboard-hub-settings.test.js` (SA16)
- `tests/sa17-cashflow-proj-settings-dynamic-inline-attr.test.js` (SA17)
- `tests/fuel-price-ref.test.js` (sesi fuel-price-ref)

**Build output (regenerasi otomatis `node scripts/build.js`):**
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (TANPA minifikasi — esbuild
  tidak terpasang di sandbox, override sama seperti sesi-sesi sebelumnya)
- `index.html`, `app_production.html` (?v=1600)
- `sw.js` (CACHE_NAME → kw-cache-v1600)

**Docs (regenerasi/update otomatis):**
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis build.js)
- `docs/RELEASE-GATE-LOG.md` (entry override ke-11 ditambahkan otomatis)
- `docs/CLAUDE.md` (entri SA18b baru ditambahkan manual sesi ini)

**Session notes (semua sesi sejak baseline v1591, akumulasi):**
- `SESSION-NOTE-fix-fuelpriceref-harga-sync.md`
- `SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md`
- `SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md`
- `SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md`
- `SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md`
- `SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md`
- `SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md`
- `SESSION-NOTE-SA16-dashboard-settings-dynamic-inline-attr.md`
- `SESSION-NOTE-SA17-cashflow-proj-settings-dynamic-inline-attr.md`
- `SESSION-NOTE-SA18a-aset-reports-penyusutan-dynamic-inline-attr.md`
- `SESSION-NOTE-SA18b-dana-titipan-portfolio-dynamic-inline-attr.md` (BARU)

## Hasil verifikasi (basis v1591 → v1600)

- `node --test tests/*.test.js`: **5812 pass, 0 fail**.
- `node scripts/build.js`: versi **s1599-... → s1600-simpleautocomplete-onfocus-generic-dispatch**.
- `node scripts/verify-window-expose.js`: OK, **79 modul** (naik dari 78 —
  window-expose baru `DanaTitipanPortfolioPresenter`).
- `node scripts/verify-bundle-freshness.js`: OK, kedua bundle segar.
- `node tests/verify-release-ready.js`: LOLOS, 2 gate (lint, minify)
  di-override manual (sandbox tanpa akses jaringan, override ke-11
  berturut-turut untuk gate yang sama).

## Progress epic S1588

SA11-SA17 (87 titik) + SA18a (6 titik) + SA18b (5 titik) = **98 dari 123**
titik audit awal tuntas (**96 dari 113** titik nyata, setelah dikurangi
false-positif komentar yang ditemukan di SA17 & audit ulang SA18).

## Next TODO

SA18c — `scan-ocr-b.js` + `titipan-expense-ui.js` (6 titik, 3-arg
literal-field pola SA15 + 1-2 arg standar) — sesi berikutnya sesuai
urutan rencana yang tercatat di SESSION-NOTE-SA18a/SA18b.
