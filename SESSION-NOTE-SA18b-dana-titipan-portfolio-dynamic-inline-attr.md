# SA18b (v1600) — Migrasi atribut event inline dinamis di `dana-titipan-portfolio-render.js`

**Basis:** app-main baseline v1591 + patch akumulasi
`PATCH-fuelpriceref-SA11-SA12-SA13-SA14ab-SA15-SA16-SA17-SA18a-v1599.zip`
yang sudah diupload sebelumnya (sudah di-apply ke proyek penuh). ZIP patch
sesi ini **AKUMULASI** SEMUA sesi sebelumnya — timpa semua file di
dalamnya ke project asli, tidak perlu apply patch-patch sebelumnya
terpisah lagi.

## Latar belakang

Lanjutan langsung dari rencana yang dicatat di
`SESSION-NOTE-SA18a-aset-reports-penyusutan-dynamic-inline-attr.md`
(audit ulang SA18: 31 titik nyata di 14 file, dipecah SA18a-SA18f).
Sesi ini: `dana-titipan-portfolio-render.js`, 5 titik, filter bar dengan
pola identik SA14a (`investasi-list-view.js`)/SA14b (`aset.js`).

## Kenapa file ini pola-nya identik SA14a/SA14b

`DanaTitipanPortfolioPresenter._renderFilterBar()` adalah turunan langsung
dari `Aset._renderFilterBar()`/`InvestmentListUI._renderFilterBar()` —
komentar S674 di source `dana-titipan-portfolio-render.js` sendiri
menyebut eksplisit "pola SAMA PERSIS `Aset.filterOwnerIds`/
`_renderFilterBar()`". Audit menemukan 4 titik dengan struktur identik
SA14a/SA14b (2 tombol klik tanpa argumen, 1 checkbox dengan argumen
string literal dinamis ownerId, 1 select dengan token `$value`) + 1 titik
tambahan di luar filter bar (`onAssetPickChange`, select "Pilih Aset" di
`_ownerCardHtml()`) yang polanya sudah ada di file yang sama
(`DanaTitipanCommitmentUI.openAssetPorsi` sudah pakai `data-args='["$el"]'`
sejak S608).

## Perubahan

**`modules/finance/dana-titipan-portfolio-render.js`** — 5 titik
dimigrasi:

1. Select "Pilih Aset" (di `_ownerCardHtml()`) —
   `onchange="DanaTitipanPortfolioPresenter.onAssetPickChange(this)"`
   → `data-onchange="DanaTitipanPortfolioPresenter.onAssetPickChange"
   data-onchange-args='["$el"]'` (token `$el`, pola sama
   `DanaTitipanCommitmentUI.openAssetPorsi` di file yang sama, S608)
2. Tombol "Pilih Semua" (di `_renderFilterBar()`) —
   `onclick="...onFilterOwnerSelectAll()"` →
   `data-action="DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll"`
   (klik, 0 args)
3. Tombol "Bersihkan" — `onclick="...onFilterOwnerClearAll()"` →
   `data-action="DanaTitipanPortfolioPresenter.onFilterOwnerClearAll"`
   (klik, 0 args)
4. Checkbox filter per-owner —
   `onchange="...onFilterOwnerToggle('id')"` →
   `data-onchange="DanaTitipanPortfolioPresenter.onFilterOwnerToggle"
   data-onchange-args='${escapeHtml(JSON.stringify([id]))}'` (owner id
   string literal, pola persis SA14a/SA14b, dibungkus tanda kutip tunggal
   supaya tidak bentrok dengan `&quot;` hasil escapeHtml)
5. Select Status Dana —
   `onchange="...onFilterSettlementChange(this.value)"` →
   `data-onchange="DanaTitipanPortfolioPresenter.onFilterSettlementChange"
   data-onchange-args='["$value"]'`

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.
`onAssetPickChange()`/`onFilterOwnerSelectAll()`/`onFilterOwnerClearAll()`/
`onFilterOwnerToggle()`/`onFilterSettlementChange()` tidak disentuh sama
sekali.

## Temuan tambahan (BEDA dari SA14a/SA14b) — window-expose

Titik #2/#3 pakai `data-action` (bukan `data-onchange`), dan gate
`scripts/verify-window-expose.js` (S423) scan SEMUA `data-action="X.method"`
di repo lalu mewajibkan modul `X` di-window-expose (`window.X = X`) di
suatu tempat. `DanaTitipanPortfolioPresenter` **sebelumnya tidak pernah**
dipakai lewat `data-action` — hanya `onclick`/`onchange` inline biasa,
yang luput dari scan gate ini (gate hanya cek `data-action=`). Setelah
migrasi ini, gate langsung merah:

```
Ditemukan modul dipakai lewat data-action tapi belum di-window-expose:
DanaTitipanPortfolioPresenter (modules/finance/dana-titipan-portfolio-render.js)
```

Diperbaiki dengan menambah satu baris di
`modules/finance/dana-titipan-portfolio-render-b.js` (file window-expose
block yang sudah ada untuk `DanaTitipanCommitmentUI`/`DanaTitipanReturnUI`/
`DanaTitipanPoolUI`):

```js
window.DanaTitipanPortfolioPresenter = DanaTitipanPortfolioPresenter;
```

0 perubahan perilaku lain — presenter tetap dipanggil lewat referensi
variabel langsung di semua tempat lain di codebase (tidak ada regresi ke
pemakaian existing).

## Regresi (sinkron ke markup baru, 0 perubahan makna test)

- `tests/s633-titipan-linkasset-toggle-collapsed.test.js` — 1 assertion:
  `onchange="...onAssetPickChange(this)"` → `data-onchange=...
  data-onchange-args='["$el"]'`
- `tests/s668-dana-titipan-owner-status-filter.test.js` — 5 assertion:
  - 2x checkbox `onFilterOwnerToggle\('id'\)` literal → `data-onchange-args`
    literal
  - 1x checked-state assertion → pola `data-onchange-args` + ` checked>`
  - 2x regex dropdown Status Dana (`<select[^>]*onchange="..."`) →
    `data-onchange="..."` (regex lama TIDAK sebenarnya gagal karena
    substring `onchange=` masih match di dalam `data-onchange=` tanpa
    lookbehind — tetap disinkronkan ke pola eksplisit baru untuk kejelasan)
  - 2x tombol SelectAll/ClearAll `\(\)` literal (parens tidak ada lagi di
    `data-action`) → `data-action="..."` literal

Tidak ada perubahan MAKNA test — fungsi yang diuji dan hasil yang
diharapkan semuanya identik, murni sinkron ke markup baru.

## Test

**Baru:** `tests/sa18b-dana-titipan-portfolio-dynamic-inline-attr.test.js`
(13 test, pola persis SA14a/SA14b/SA18a):
- Gate statis permanen: 0 atribut event inline tersisa di file ini, +
  sanity check regex-nya sendiri.
- Gate: tepat 5 titik data-action/data-onchange baru ada di source.
- Gate baru (temuan tambahan sesi ini): `DanaTitipanPortfolioPresenter`
  di-window-expose di `dana-titipan-portfolio-render-b.js`.
- 4 test markup: `_renderFilterBar()`/`_ownerCardHtml()` nyata
  menghasilkan `data-action`/`data-onchange`/`data-onchange-args` yang
  benar (termasuk token `$el` utk `onAssetPickChange`).
- 5 test end-to-end: dataset hasil migrasi diproses lewat dispatcher ASLI
  (diekstrak dari source yang sama persis, TIDAK diubah lagi sesi ini) —
  2 lewat `_dataActionClickHandler` (SelectAll/ClearAll benar-benar
  mengisi/mengosongkan `filterOwnerIds`), 3 lewat
  `_dataActionInputChangeHandler` (toggle per-owner, ganti status Dana,
  & `onAssetPickChange` dgn token `$el` semuanya benar-benar terpanggil
  dengan argumen tepat).

## Hasil build & test

- `node --test tests/*.test.js`: **5812 pass, 0 fail** (baseline sebelum
  sesi ini 5799 + 13 test baru SA18b = 5812, cocok).
- `node scripts/build.js`: versi **1599 -> 1600** (slug tidak berubah,
  cuma bump otomatis). `app_production.html`, `sw.js` (CACHE_NAME), dan
  versi konstanta di 5 file source disinkronkan otomatis. Bundle **TANPA
  minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` → OK, **79 modul** (naik dari 78
  — window-expose baru `DanaTitipanPortfolioPresenter`).
- `node scripts/verify-bundle-freshness.js` → OK, kedua bundle segar.
- `node tests/verify-release-ready.js` → **lolos, dengan override manual**
  untuk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang) — sandbox tanpa akses jaringan, sama seperti sesi-sesi
  sebelumnya. **⚠️ Override ke-11 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, SA14a, SA14b, SA15-SA17
  digabung, SA18a, sekarang SA18b) — makin mendesak: jalankan
  `npm install --save-dev eslint esbuild` begitu W kerja di environment
  dengan akses jaringan, lalu `node scripts/build.js` ulang tanpa
  override.

## docs/CLAUDE.md

Diupdate sesi ini dengan 1 entri baru (SA18b).

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a, tidak diubah lagi)
modules/asset/aset.js                            (SA14b, tidak diubah lagi)
modules/business/shop-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/business/shop-scan-ui.js                 (SA15, tidak diubah lagi)
modules/vehicle/vehicle-catalog-import-ui.js     (SA15, tidak diubah lagi)
modules/vehicle/honda-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/vehicle/vehicle-catalog-web-import-ui.js (SA15, tidak diubah lagi)
modules/dashboard-hub/dashboard-hub-settings.js  (SA16, tidak diubah lagi)
modules/modules-render.js                        (SA16, tidak diubah lagi)
modules/shop/modules-render.js                   (SA16, tidak diubah lagi)
modules/finance/cashflow-projection-presenter.js (SA17, tidak diubah lagi)
modules/asset/aset-reports.js                    (SA18a, tidak diubah lagi)
modules/finance/dana-titipan-portfolio-render.js (SA18b — 5 titik dimigrasi, BARU sesi ini)
modules/finance/dana-titipan-portfolio-render-b.js (SA18b — BARU, window-expose Presenter)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1600)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1600)
tests/sa18b-dana-titipan-portfolio-dynamic-inline-attr.test.js (BARU, SA18b)
tests/s633-titipan-linkasset-toggle-collapsed.test.js (fix regresi SA18b)
tests/s668-dana-titipan-owner-status-filter.test.js (fix regresi SA18b)
tests/sa18a-aset-reports-penyusutan-dynamic-inline-attr.test.js (SA18a, tidak diubah lagi)
tests/aset-dynamic-inline-attr-sa14b.test.js     (SA14b, tidak diubah lagi)
tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js (SA14a, tidak diubah lagi)
tests/s664-investmentlistui-filterbar-owner-count-badge.test.js (SA14a, tidak diubah lagi)
tests/s669-investmentlistui-multiselect-owner-filter.test.js (SA14a, tidak diubah lagi)
tests/s671-investmentlistui-filter-select-all-clear.test.js (SA14a, tidak diubah lagi)
tests/aset-owners-dynamic-inline-attr-sa11.test.js (SA11, tidak diubah lagi)
tests/investasi-view-dynamic-inline-attr-sa12.test.js (SA12, tidak diubah lagi)
tests/akun-accowners-dynamic-inline-attr-sa13.test.js (SA13, tidak diubah lagi)
tests/asset-owners-flow-e2e-392a-to-392e.test.js  (SA11, tidak diubah lagi)
tests/fuel-price-ref.test.js                     (sesi fuel-price-ref, tidak diubah lagi)
tests/s552-investment-owners-nominal-bidirectional.test.js (SA12, tidak diubah lagi)
tests/sa15-import-preview-dynamic-inline-attr.test.js (SA15, tidak diubah lagi)
tests/sa16-dashboard-settings-dynamic-inline-attr.test.js (SA16, tidak diubah lagi)
tests/dashboard-hub-settings.test.js             (SA16, tidak diubah lagi)
tests/sa17-cashflow-proj-settings-dynamic-inline-attr.test.js (SA17, tidak diubah lagi)
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (entry override ke-11, auto-append)
docs/CLAUDE.md                                    (1 entri baru: SA18b)
MANIFEST-PATCH-SA18a.md                           (dari sesi sebelumnya, tidak diubah lagi)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (SA13)
SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md (SA14a)
SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md    (SA14b)
SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md (SA15)
SESSION-NOTE-SA16-dashboard-settings-dynamic-inline-attr.md (SA16)
SESSION-NOTE-SA17-cashflow-proj-settings-dynamic-inline-attr.md (SA17)
SESSION-NOTE-SA18a-aset-reports-penyusutan-dynamic-inline-attr.md (SA18a)
SESSION-NOTE-SA18b-dana-titipan-portfolio-dynamic-inline-attr.md (BARU, sesi ini)
```

## Progress epic S1588

SA11-SA17 (87 titik) + SA18a (6 titik) + SA18b (5 titik) = **98 dari 123**
titik audit awal tuntas (**96 dari 113** titik nyata setelah dikurangi
false-positif komentar SA17+SA18). Sisa: SA18c-SA18f (19 titik nyata, 12
file).

| Sesi | File | Titik | Pola |
|---|---|---|---|
| SA18c (rekomendasi sesi berikutnya) | `scan-ocr-b.js` + `titipan-expense-ui.js` | 6 | 3-arg literal-field (pola SA15) + 1-2 arg standar |
| SA18d | `budget.js` + `modules-calc.js` | 4 | token `$el` baru dipakai lintas file kembar (mirip duplikasi dashboard SA16) |
| SA18e | `kategorisasi-ai.js` + `aset-emas-impor.js` | 4 | 0-arg klik (pola SA16) + 1 titik onblur RANGKAP 2 fungsi (`evalAmtExpr('literal'),GoldZakat.onHargaInput()`) — perlu verifikasi comma-separated dgn args campuran |
| SA18f | `data-archive.js`, `vehicle-core.js`, `cobek-order.js`, `filter-laporan.js`, `tukang-absensi.js`, `car-notes.js` | 6 | 5 titik pola standar (literal+`$el`/`$value`/literal) + **1 titik `vehicle-core.js` BUKAN pemanggilan fungsi bernama** — perlu bikin 1 fungsi named baru dulu sebelum bisa dimigrasi, beda kelas risiko dari titik lain (bukan 0-logic pure attribute swap) |

## Belum diuji di browser sungguhan

Sandbox ini tidak ada akses browser — kalau W punya kesempatan, coba buka
tab Dana Titipan → filter Pemilik (checkbox multi-select, tombol Pilih
Semua/Bersihkan, dropdown Status) + dropdown "Pilih Aset" per kartu owner
di Chrome/Edge/Firefox versi lama vs baru untuk konfirmasi independen
migrasi ini benar di bawah CSP `script-src-attr 'none'`.

## Next TODO

SA18c — `scan-ocr-b.js` + `titipan-expense-ui.js` (6 titik, 3-arg
literal-field pola SA15 + 1-2 arg standar) — sesi berikutnya sesuai
urutan rencana di atas.
