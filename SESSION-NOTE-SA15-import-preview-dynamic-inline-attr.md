# SA15 (v1596) — Migrasi atribut event inline dinamis di 5 file preview import

**Basis:** app-main baseline v1591 + patch akumulasi
`PATCH-fuelpriceref-SA11-SA12-SA13-SA14ab-v1595.zip` yang sudah diupload
sebelumnya (sesi fix-fuelpriceref-harga-sync + SA11 + SA12 + SA13 + SA14a
+ SA14b, sudah di-apply ke proyek penuh). ZIP patch sesi ini **AKUMULASI**
SEMUA sesi sebelumnya — timpa semua file di dalamnya ke project asli,
tidak perlu apply patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md`
(rekomendasi #3), rencana 8 sesi SA11-SA18. SA11-SA14 (aset-owners.js,
investasi-view.js, akun.js, investasi-list-view.js, aset.js) sudah tuntas.
SA15 = 5 file "preview import" (22 titik), sesuai urutan rencana yang
dicatat di `SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md`:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA15 (sesi ini)** | preview import (5 file) | 22 |
| SA16 (rencana) | dashboard settings | 17 |
| SA17 (rencana) | cashflow-projection-presenter.js dkk | 8 |
| SA18 (rencana) | 18 file sisa | 45 |

## Kenapa file ini beda pola dari SA11-SA14

Semua 22 titik pola SAMA persis lintas 5 file — audit menemukan struktur
identik: 1 checkbox `onchange="X.toggleRow(idx)"` (1 arg numerik, "sertakan
baris ini ke import") + 3-4 input `oninput="X.editField(idx,'field',this.value)"`
(3 arg: idx numerik, **NAMA FIELD LITERAL**, token `$value`). Pola 3-arg
dengan literal field name di tengah ini **BARU** — SA11-SA14 selalu 2-arg
(`[i,"$value"]` atau `[i,"$checked"]`, tanpa literal string ketiga).
Dispatcher (`_dataActionResolveArgs`, `modules/shared/features-helpers-global-security.js`)
sudah generik mendukung array campuran literal+token (memetakan token
`$value`/`$checked`/`$el`/`$event`/`$nav:N`, string lain lolos apa adanya)
— **0 perubahan infrastruktur**, cukup dipakai apa adanya.

## Perubahan

5 file, pola migrasi identik per titik:

1. Checkbox "sertakan baris" — `onchange="X.toggleRow(idx)"`
   → `data-onchange="X.toggleRow" data-onchange-args='[idx]'`
2. Input field (per field) — `oninput="X.editField(idx,'field',this.value)"`
   → `data-oninput="X.editField" data-oninput-args='[idx,"field","$value"]'`

Rincian titik per file:

| File | Namespace | Titik | Field |
|---|---|---|---|
| `modules/vehicle/vehicle-catalog-import-ui.js` | `VehicleCatalogImportUI` | 5 | partName, category, oemCode, price |
| `modules/vehicle/honda-pdf-import-ui.js` | `HondaPdfImportUI` | 5 | partName, category, oemCode, price |
| `modules/vehicle/vehicle-catalog-web-import-ui.js` | `VehicleCatalogWebImportUI` | 4 | partName, oemCode, price |
| `modules/business/shop-scan-ui.js` | `ShopScanUI` | 4 | nama, kategori, harga |
| `modules/business/shop-pdf-import-ui.js` | `ShopPdfImportUI` | 4 | nama, kategori, harga |

Total 22 titik (5+5+4+4+4), sesuai audit awal. Tidak ada perubahan LOGIC
apa pun — murni migrasi cara handler dipanggil. Fungsi `toggleRow`/`editField`
di kelima file tidak disentuh sama sekali.

## Test

**Baru:** `tests/sa15-import-preview-dynamic-inline-attr.test.js` (38 test,
parametrized lintas 5 file dalam 1 file test — pola sama SA11-SA14a/b tapi
di-loop per-file karena strukturnya identik):
- Gate statis permanen per file: 0 atribut event inline tersisa.
- Gate sanity: regex-nya sendiri terverifikasi mendeteksi pola asli & tidak
  salah tangkap `data-onchange=`/`data-oninput=`.
- Gate string literal: tiap titik `data-onchange`/`data-oninput` + field
  literal + `$value` yang diharapkan benar-benar ada di source (22 titik
  tercakup lewat kombinasi namespace × field per file).
- 10 test end-to-end (2 per file: `toggleRow` & `editField`) lewat
  dispatcher ASLI (`_dataActionInputChangeHandler`, diekstrak dari source
  yang sama persis, TIDAK diubah lagi sesi ini) memakai objek stub (spy)
  per namespace — memverifikasi KHUSUS pola args 3-elemen
  `[idx, "field literal", "$value"]` yang baru dipakai sesi ini benar-benar
  ter-resolve dengan urutan & nilai argumen yang tepat.

**Regresi:** audit menemukan **0 test lama** yang menguji markup render
preview (`toggleRow`/`editField`/`renderPreview`-setara) di kelima file
ini — test yang ada sebelumnya (`vehicle-catalog-import.test.js`,
`honda-pdf-import*.test.js`, `vehicle-catalog-web-import.test.js`,
`shop-pdf-import.test.js`, `shop-scan-ui.test.js`) semuanya menguji layer
logic murni (parsing/commit), bukan lapisan UI markup — jadi 0 file test
lama perlu disinkronkan.

## Hasil build & test

- `node --test tests/*.test.js`: **5750 pass, 0 fail** (baseline sebelum
  sesi ini 5712 + 38 test baru SA15 = 5750, cocok).
- `node scripts/build.js`: versi **1595 -> 1596**. `app_production.html`,
  `sw.js` (CACHE_NAME), dan versi konstanta di 5 file source disinkronkan
  otomatis. Bundle **TANPA minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` -> OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` -> kedua bundle segar.
- `node tests/verify-release-ready.js` -> **lolos, dengan override manual**
  untuk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang). **⚠️ Override ke-7 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, SA14a, SA14b, sekarang SA15) —
  makin mendesak: jalankan `npm install --save-dev eslint esbuild` begitu
  W kerja di environment dengan akses jaringan.

## docs/CLAUDE.md

Diupdate sesi ini dengan 1 entri baru (SA15).

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a, tidak diubah lagi)
modules/asset/aset.js                            (SA14b, tidak diubah lagi)
modules/vehicle/vehicle-catalog-import-ui.js     (SA15 — 5 titik dimigrasi, BARU sesi ini)
modules/vehicle/honda-pdf-import-ui.js           (SA15 — 5 titik dimigrasi, BARU sesi ini)
modules/vehicle/vehicle-catalog-web-import-ui.js (SA15 — 4 titik dimigrasi, BARU sesi ini)
modules/business/shop-scan-ui.js                 (SA15 — 4 titik dimigrasi, BARU sesi ini)
modules/business/shop-pdf-import-ui.js           (SA15 — 4 titik dimigrasi, BARU sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
modules/shared/modules-render.js                 (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1596)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1596)
tests/sa15-import-preview-dynamic-inline-attr.test.js (BARU, SA15)
tests/aset-dynamic-inline-attr-sa14b.test.js     (SA14b, tidak diubah lagi)
tests/s667-aset-owner-status-filter.test.js      (SA14b, tidak diubah lagi)
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
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (log override ke-7, auto-append)
docs/CLAUDE.md                                    (1 entri baru: SA15)
MANIFEST-PATCH-fuelpriceref-SA11-SA12.md          (dari sesi sebelumnya, tidak diubah lagi)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (SA13)
SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md (SA14a)
SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md    (SA14b)
SESSION-NOTE-SA15-import-preview-dynamic-inline-attr.md (BARU, sesi ini)
```

## Sisa antrian epic S1588

SA11-SA15 tuntas (67 dari 123 titik). Sisa:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA16 (rekomendasi sesi berikutnya)** | dashboard settings (3× `modules-render.js` + `dashboard-hub-settings.js`) | 17 |
| SA17 | `cashflow-projection-presenter.js`, `tx-bbm.js`, `cicilan.js`, `tx-stok-sparepart.js` | 8 |
| SA18 | 18 file sisa tersebar (`aset-reports.js`, `titipan-expense-ui.js`, `dana-titipan-portfolio-render.js`, dll) | 45 |

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override
   ke-7 berturut-turut untuk gate yang sama sejak beberapa sesi lalu.
2. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka salah satu dari 5 alur
   preview import (mis. Import Katalog Motor dari PDF) di Chrome/Edge/
   Firefox versi lama vs versi baru: centang/uncentang baris, edit field
   nama/kategori/harga, lalu commit — untuk konfirmasi independen bahwa
   migrasi ini memang memperbaiki masalah nyata di bawah CSP
   `script-src-attr 'none'`.
3. SA16 (dashboard settings, 17 titik, 4 file) direkomendasikan sesi
   berikutnya sesuai urutan rencana — belum diaudit detail, perlu audit
   dulu sebelum coding (kemungkinan pola beda karena melibatkan 3 lokasi
   berbeda di `modules-render.js`).
