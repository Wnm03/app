# SA14 sesi 2/2 (v1595) — Migrasi atribut event inline dinamis di `aset.js`

**Basis:** app-main baseline v1591 + patch akumulasi
`PATCH-fuelpriceref-SA11-SA12-SA13-SA14a-v1594.zip` yang sudah diupload
sebelumnya (sesi fix-fuelpriceref-harga-sync + SA11 + SA12 + SA13 + SA14a,
sudah di-apply ke proyek penuh). ZIP patch sesi ini **AKUMULASI** SEMUA sesi
sebelumnya — timpa semua file di dalamnya ke project asli, tidak perlu apply
patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan langsung SA14a (sesi sebelumnya, hari yang sama) —
menuntaskan SA14 dari rencana 8 sesi SA11-SA18
(`docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` rekomendasi #3):

| Sesi | Cakupan | Titik |
|---|---|---|
| SA14a (selesai) | `investasi-list-view.js` | 4 |
| **SA14b (sesi ini)** | `aset.js` | 4 |

## Kenapa file ini identik polanya dengan SA14a

`Aset._renderFilterBar()` adalah turunan langsung dari
`InvestmentListUI._renderFilterBar()` — komentar S671/S673 di source
`aset.js` sendiri menyebut eksplisit "pola SAMA PERSIS InvestmentListUI".
Audit menemukan 4 titik dengan struktur identik SA14a: 2 tombol klik
tanpa argumen (Pilih Semua/Bersihkan), 1 checkbox dengan argumen string
literal dinamis (ownerId), 1 select dengan token `$value`. Tidak ada
kejutan pola baru dibanding SA14a.

## Perubahan

**`modules/asset/aset.js`** — 4 titik dimigrasi, semua di
`_renderFilterBar()`:

1. Tombol "Pilih Semua" — `onclick="Aset.onFilterOwnerSelectAll()"`
   → `data-action="Aset.onFilterOwnerSelectAll"` (klik, 0 args)
2. Tombol "Bersihkan" — `onclick="Aset.onFilterOwnerClearAll()"`
   → `data-action="Aset.onFilterOwnerClearAll"` (klik, 0 args)
3. Checkbox filter per-owner — `onchange="Aset.onFilterOwnerToggle('id')"`
   → `data-onchange="Aset.onFilterOwnerToggle"
   data-onchange-args='${escapeHtml(JSON.stringify([id]))}'` (owner id
   string literal, pola persis SA14a, dibungkus tanda kutip tunggal
   supaya tidak bentrok dengan `&quot;` hasil escapeHtml)
4. Select Status Dana — `onchange="Aset.onFilterSettlementChange(this.value)"`
   → `data-onchange="Aset.onFilterSettlementChange"
   data-onchange-args='["$value"]'`

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.
Semua fungsi `onFilterOwner*`/`onFilterSettlementChange` di `Aset` tidak
disentuh sama sekali.

## Test

**Baru:** `tests/aset-dynamic-inline-attr-sa14b.test.js` (10 test, pola
persis `investasi-list-view-dynamic-inline-attr-sa14a.test.js`):
- Gate statis permanen: 0 atribut event inline tersisa di file ini, +
  sanity check regex-nya sendiri.
- Gate: tepat 4 titik data-action/data-onchange baru ada di source.
- 3 test markup: `_renderFilterBar()` nyata menghasilkan
  `data-action`/`data-onchange`/`data-onchange-args` yang benar.
- 3 test end-to-end: dataset hasil migrasi diproses lewat dispatcher ASLI
  (diekstrak dari source yang sama persis, TIDAK diubah lagi sesi ini) —
  2 lewat `_dataActionClickHandler` (Pilih Semua/Bersihkan benar-benar
  mengisi/mengosongkan `filterOwnerIds`), 2 lewat
  `_dataActionInputChangeHandler` (toggle per-owner & ganti status Dana
  benar-benar terpanggil dengan argumen tepat).

**Diperbaiki (regresi dari migrasi ini):** `tests/s667-aset-owner-status-filter.test.js`
— 5 assertion markup lama diupdate ke pola baru (makna test 0 berubah,
hanya sinkron ke markup):
- 2 assertion tombol Pilih Semua/Bersihkan (`Aset\.onFilterOwnerSelectAll\(\)`
  dst) → `data-action="Aset.onFilterOwnerSelectAll"` dst
- 2 assertion checkbox (`onFilterOwnerToggle('istri1')` dst) →
  `data-onchange-args='["istri1"]'` dst — catatan: `makeCtx()` di file
  test ini pakai `escapeHtml: (s) => String(s)` (identity, bukan
  escaping asli), jadi assertion di sini TIDAK mengandung `&quot;`
  (beda dari test SA14b baru yang pakai escapeHtml asli)
- 2 assertion select Status (`onchange="Aset\.onFilterSettlementChange...`)
  → `data-onchange="Aset\.onFilterSettlementChange"...`

Tidak ada perubahan MAKNA test — fungsi yang diuji dan hasil yang
diharapkan semuanya identik, murni sinkron ke markup baru.

## Hasil build & test

- `node --test tests/*.test.js`: **5712 pass, 0 fail** (baseline sebelum
  sesi ini 5702 + 10 test baru SA14b = 5712, cocok).
- `node scripts/build.js`: versi **1594 -> 1595** (slug tidak berubah,
  cuma bump otomatis). `app_production.html`, `sw.js` (CACHE_NAME), dan
  versi konstanta di 5 file source disinkronkan otomatis. Bundle **TANPA
  minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` -> OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` -> kedua bundle segar.
- `node tests/verify-release-ready.js` -> **lolos, dengan override manual**
  untuk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang) — sandbox tanpa akses jaringan, sama seperti sesi-sesi
  sebelumnya. **⚠️ Override ke-6 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, SA14a, sekarang SA14b) — makin
  mendesak: jalankan `npm install --save-dev eslint esbuild` begitu W
  kerja di environment dengan akses jaringan, lalu `node scripts/build.js`
  ulang tanpa override.

## docs/CLAUDE.md

Diupdate sesi ini dengan 2 entri sekaligus (SA14a yang tertunda dari
sesi sebelumnya + SA14b sesi ini), sesuai rencana di
SESSION-NOTE-SA14a.

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a, tidak diubah lagi)
modules/asset/aset.js                            (SA14b — 4 titik dimigrasi, BARU sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
modules/shared/modules-render.js                 (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1595)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1595)
tests/aset-dynamic-inline-attr-sa14b.test.js     (BARU, SA14b)
tests/s667-aset-owner-status-filter.test.js      (fix regresi SA14b)
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
docs/RELEASE-GATE-LOG.md                          (log override ke-6, auto-append)
docs/CLAUDE.md                                    (2 entri baru: SA14a tertunda + SA14b)
MANIFEST-PATCH-fuelpriceref-SA11-SA12.md          (dari sesi sebelumnya, tidak diubah lagi)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (SA13)
SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md (SA14a)
SESSION-NOTE-SA14b-aset-dynamic-inline-attr.md    (BARU, sesi ini)
```

## SA14 TUNTAS — sisa antrian epic S1588

SA11-SA14 (investasi-list-view.js + aset.js) semuanya tuntas. SA15-SA18
(91 dari 123 titik audit S1588 yang tersisa di 32 file lain) masih 0
disentuh:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA15 (rekomendasi sesi berikutnya)** | preview import (vehicle-catalog-import-ui.js, honda-pdf-import-ui.js, vehicle-catalog-web-import-ui.js, shop-scan-ui.js, shop-pdf-import-ui.js) | 22 |
| SA16 | dashboard settings (3× modules-render.js + dashboard-hub-settings.js) | 17 |
| SA17 | cashflow-projection-presenter.js, tx-bbm.js, cicilan.js, tx-stok-sparepart.js | 8 |
| SA18 | 18 file sisa tersebar (aset-reports.js, titipan-expense-ui.js, dana-titipan-portfolio-render.js, dll) | 45 |

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override
   ke-6 berturut-turut untuk gate yang sama sejak beberapa sesi lalu.
2. Setelah SA11-SA18 semua tuntas & grep repo-wide S1588 balik 0, baru
   disclaimer CSP "TUNTAS 100%" boleh diperluas cakupannya ke seluruh app.
3. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka halaman Buku Aset
   (filter pemilik, tombol Pilih Semua/Bersihkan, dropdown Status Dana)
   di Chrome/Edge/Firefox versi lama vs versi baru, untuk konfirmasi
   independen bahwa migrasi ini memang memperbaiki masalah nyata.
