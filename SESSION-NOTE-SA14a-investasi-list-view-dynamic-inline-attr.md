# SA14 sesi 1/2 (v1594) — Migrasi atribut event inline dinamis di `investasi-list-view.js`

**Basis:** app-main baseline v1591 + patch akumulasi `PATCH-fuelpriceref-SA11-SA12-SA13-v1593.zip`
yang sudah diupload sebelumnya (sesi fix-fuelpriceref-harga-sync + SA11 + SA12 + SA13,
sudah di-apply ke proyek penuh). ZIP patch sesi ini **AKUMULASI** SEMUA sesi
sebelumnya — timpa semua file di dalamnya ke project asli, tidak perlu apply
patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (rekomendasi
#3), rencana 8 sesi SA11-SA18 (lihat tabel di
`SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md`). SA11
(`aset-owners.js`, 10 titik), SA12 (`investasi-view.js`, 10 titik), SA13
(`akun.js`/AccOwners, 7 titik) sudah tuntas. Rencana awal SA14 = 2 file
(`investasi-list-view.js` 4 titik + `aset.js` 4 titik) — **sesuai instruksi
W, dipecah jadi 2 sesi ringan** supaya blast radius tetap kecil per patch:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA14a (sesi ini)** | `investasi-list-view.js` | 4 |
| SA14b (menyusul) | `aset.js` | 4 |

## Kenapa file ini beda pola dari SA11-SA13

SA11-SA13 semuanya migrasi field `<input>`/`<select>` (oninput/onchange),
memakai dispatcher `data-oninput`/`data-onchange`
(`_dataActionInputChangeHandler`/`_dataActionResolveArgs`,
`modules/shared/features-helpers-global-security.js`). SA14a **beda**: 2
dari 4 titik adalah tombol `<button onclick=...>` **tanpa argumen**
("Pilih Semua"/"Bersihkan"), yang memakai dispatcher **klik** yang berbeda
(`data-action`, `_dataActionClickHandler`) — dispatcher ini sudah lebih
dulu dipakai luas di seluruh app (bukan buatan sesi ini), cuma baru sesi
ini dipakai di file `investasi-list-view.js`.

Titik ke-3 (checkbox filter per-owner) juga pola baru: argumennya bukan
index numerik (`i`, seperti semua SA11-SA13) atau token `$value`/`$checked`,
tapi **string literal dinamis** (`ownerId`). Untuk ini dipakai pola yang
sudah ada precedent-nya di `modules/shared/modules-render.js`
(`data-args="${escapeHtml(JSON.stringify([id]))}"`) — id di-JSON-encode lalu
di-escapeHtml supaya aman disisipkan ke atribut HTML (karakter `"` jadi
`&quot;`, browser decode otomatis saat baca `el.dataset`), BUKAN
interpolasi string mentah seperti kode lama (`onFilterOwnerToggle('id')`
rentan XSS/pecah kalau id mengandung tanda kutip — 0 laporan bug soal ini,
tapi migrasi ini sekalian memperbaikinya sbg efek samping positif).

## Perubahan

**`modules/asset/investasi-list-view.js`** — 4 titik dimigrasi, semua di
`_renderFilterBar()`:

1. Tombol "Pilih Semua" — `onclick="InvestmentListUI.onFilterOwnerSelectAll()"`
   → `data-action="InvestmentListUI.onFilterOwnerSelectAll"` (klik, 0 args)
2. Tombol "Bersihkan" — `onclick="InvestmentListUI.onFilterOwnerClearAll()"`
   → `data-action="InvestmentListUI.onFilterOwnerClearAll"` (klik, 0 args)
3. Checkbox filter per-owner — `onchange="InvestmentListUI.onFilterOwnerToggle('id')"`
   → `data-onchange="InvestmentListUI.onFilterOwnerToggle"
   data-onchange-args="${escapeHtml(JSON.stringify([id]))}"` (owner id
   string literal, bukan `$value`/`$checked`)
4. Select Status Dana — `onchange="InvestmentListUI.onFilterSettlementChange(this.value)"`
   → `data-onchange="InvestmentListUI.onFilterSettlementChange"
   data-onchange-args='["$value"]'`

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil.
Semua fungsi `onFilterOwner*`/`onFilterSettlementChange` di `InvestmentListUI`
tidak disentuh sama sekali.

## Test

**Baru:** `tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js`
(10 test):
- Gate statis permanen: 0 atribut event inline tersisa di file ini (regex
  sama persis dgn audit S1588), + sanity check regex-nya sendiri (kali ini
  juga memastikan `data-action=` tidak salah tangkap, krn sesi ini pertama
  kali file ini pakai dispatcher klik selain dispatcher input/change).
- 3 test markup: `_renderFilterBar()` nyata menghasilkan `data-action`/
  `data-onchange`/`data-onchange-args` yang benar, termasuk cek entity
  `&quot;` hasil `escapeHtml(JSON.stringify(...))` utk id owner.
- 4 test end-to-end: dataset hasil migrasi diproses lewat dispatcher ASLI
  (diekstrak dari source yang sama persis, TIDAK diubah lagi sesi ini) —
  2 lewat `_dataActionClickHandler` (Pilih Semua/Bersihkan benar-benar
  mengisi/mengosongkan `filterOwnerIds`), 2 lewat
  `_dataActionInputChangeHandler` (toggle per-owner & ganti status Dana
  benar-benar terpanggil dgn argumen tepat).

**Diperbaiki (regresi dari migrasi ini):** 3 file test lama yang menguji
`_renderFilterBar()`/`_renderList()` lewat regex markup pola inline lama
— pola sama seperti fix regresi SA11 (`asset-owners-flow-e2e-392a-to-392e.test.js`):
- `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js` — 3
  assertion `/onFilterOwnerToggle\('istri1'\)/` diupdate ke pola
  `data-onchange=".../onFilterOwnerToggle" data-onchange-args='[&quot;istri1&quot;]'`
- `tests/s669-investmentlistui-multiselect-owner-filter.test.js` — 1
  assertion dropdown Status (`onchange="...(this.value)"`) + 2 assertion
  atribut `checked` pada checkbox diupdate ke pola `data-onchange`/
  `data-onchange-args` baru
- `tests/s671-investmentlistui-filter-select-all-clear.test.js` — 2
  assertion tombol Pilih Semua/Bersihkan (`/onFilterOwnerSelectAll\(\)/`)
  + 1 assertion checkbox `checked` per-owner (loop `owner1..owner6`)
  diupdate ke pola `data-action`/`data-onchange-args` baru

Tidak ada perubahan MAKNA test di ke-3 file di atas, murni sinkron ke
markup baru (fungsi yang diuji, hasil yang diharapkan — semuanya identik).

## Hasil build & test

- `node --test tests/*.test.js`: **5702 pass, 0 fail** (baseline sebelum
  sesi ini 5692 + 10 test baru SA14a = 5702, cocok).
- `node scripts/build.js`: versi **1593 -> 1594** (slug tidak berubah,
  cuma bump otomatis). `app_production.html`, `sw.js` (CACHE_NAME), dan
  versi konstanta di 5 file source disinkronkan otomatis. Bundle **TANPA
  minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` -> OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` -> kedua bundle segar.
- `node tests/verify-release-ready.js` -> **lolos, dengan override manual**
  utk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang) — sandbox tanpa akses jaringan, sama seperti sesi-sesi
  sebelumnya. **⚠️ Override ke-5 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, sekarang SA14a) — makin
  mendesak: jalankan `npm install --save-dev eslint esbuild` begitu W
  kerja di environment dengan akses jaringan, lalu `node scripts/build.js`
  ulang tanpa override.

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a — 4 titik dimigrasi, BARU sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
modules/shared/modules-render.js                 (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1594)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1594)
tests/investasi-list-view-dynamic-inline-attr-sa14a.test.js (BARU, SA14a)
tests/s664-investmentlistui-filterbar-owner-count-badge.test.js (fix regresi SA14a)
tests/s669-investmentlistui-multiselect-owner-filter.test.js (fix regresi SA14a)
tests/s671-investmentlistui-filter-select-all-clear.test.js (fix regresi SA14a)
tests/aset-owners-dynamic-inline-attr-sa11.test.js (SA11, tidak diubah lagi)
tests/investasi-view-dynamic-inline-attr-sa12.test.js (SA12, tidak diubah lagi)
tests/akun-accowners-dynamic-inline-attr-sa13.test.js (SA13, tidak diubah lagi)
tests/asset-owners-flow-e2e-392a-to-392e.test.js  (fix regresi SA11, tidak diubah lagi)
tests/fuel-price-ref.test.js                     (sesi fuel-price-ref, tidak diubah lagi)
tests/s552-investment-owners-nominal-bidirectional.test.js (SA12, tidak diubah lagi)
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (log override ke-5, auto-append)
docs/CLAUDE.md                                    (belum diupdate sesi ini — lihat TODO di bawah)
MANIFEST-PATCH-fuelpriceref-SA11-SA12.md          (dari sesi sebelumnya, tidak diubah lagi)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (SA13)
SESSION-NOTE-SA14a-investasi-list-view-dynamic-inline-attr.md (BARU, sesi ini)
```

## JANGAN dikerjakan sesi ini (sengaja, sesuai instruksi "1 sesi 1 patch")

**SA14b (`aset.js`, 4 titik)** — belum disentuh sama sekali sesi ini, jadi
sesi berikutnya. SA15-SA18 (91 dari 123 titik audit S1588 yang tersisa di
32 file lain) juga masih 0 disentuh:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA14b (rekomendasi sesi berikutnya)** | `aset.js` | 4 |
| SA15 | preview import (vehicle-catalog-import-ui.js, honda-pdf-import-ui.js, vehicle-catalog-web-import-ui.js, shop-scan-ui.js, shop-pdf-import-ui.js) | 22 |
| SA16 | dashboard settings (3× modules-render.js + dashboard-hub-settings.js) | 17 |
| SA17 | cashflow-projection-presenter.js, tx-bbm.js, cicilan.js, tx-stok-sparepart.js | 8 |
| SA18 | 18 file sisa tersebar (aset-reports.js, titipan-expense-ui.js, dana-titipan-portfolio-render.js, dll) | 45 |

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override
   ke-5 berturut-turut untuk gate yang sama sejak beberapa sesi lalu.
2. `docs/CLAUDE.md` belum diupdate dgn entri sesi SA14a — perlu ditambah
   di sesi berikutnya (SA14b) sekalian, supaya 1x update mencakup 2 sesi.
3. Setelah SA11-SA18 semua tuntas & grep repo-wide S1588 balik 0, baru
   disclaimer CSP "TUNTAS 100%" boleh diperluas cakupannya ke seluruh app.
4. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka halaman Investasi
   (filter pemilik, tombol Pilih Semua/Bersihkan, dropdown Status Dana)
   di Chrome/Edge/Firefox versi lama vs versi baru, untuk konfirmasi
   independen bahwa migrasi ini memang memperbaiki masalah nyata.
