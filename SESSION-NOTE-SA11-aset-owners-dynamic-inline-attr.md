# SA11 (v1592) — Migrasi atribut event inline dinamis di `aset-owners.js`

**Basis:** app-main baseline v1591 + patch `fix-fuelpriceref-harga-sync` yang
sudah diupload sebelumnya (`SESSION-NOTE-fix-fuelpriceref-harga-sync.md`,
timpa ke project asli lebih dulu kalau belum). ZIP patch ini **AKUMULASI**
kedua sesi — timpa semua file di dalamnya ke project asli, tidak perlu apply
patch fuel-price-ref terpisah lagi.

## Latar belakang

Lanjutan dari `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (rekomendasi #3):
CSP aktif sekarang (`script-src` tanpa `'unsafe-inline'` + `script-src-attr
'none'`, hasil SA9/SA10a) hanya menuntaskan markup STATIS di
index.html/app_production.html. Audit ulang sesi ini mengonfirmasi persis
temuan S1588: **38 file `modules/*.js` masih punya 123 atribut event inline
(`onclick=`/`onchange=`/`oninput=`) yang di-generate dinamis lalu
di-`innerHTML=`** — berisiko 0 reaksi di browser modern karena CSP menyaring
atribut inline di manapun ia muncul, termasuk yang di-inject lewat
`innerHTML`.

Rencana besar dipecah jadi 8 sesi ringan (SA11-SA18) berdasarkan area fitur,
supaya blast radius tiap patch kecil dan mudah di-review:

| Sesi | Cakupan | Titik |
|---|---|---|
| **SA11 (sesi ini)** | `aset-owners.js` | 10 |
| SA12 | `investasi-view.js` | 10 |
| SA13 | `akun.js` (AccOwners) | 7 |
| SA14 | `investasi-list-view.js` + `aset.js` | 4+4 |
| SA15 | preview import (vehicle-catalog-import-ui.js, honda-pdf-import-ui.js, vehicle-catalog-web-import-ui.js, shop-scan-ui.js, shop-pdf-import-ui.js) | 22 |
| SA16 | dashboard settings (3× modules-render.js + dashboard-hub-settings.js) | 17 |
| SA17 | cashflow-projection-presenter.js, tx-bbm.js, cicilan.js, tx-stok-sparepart.js | 8 |
| SA18 | 18 file sisa tersebar (aset-reports.js, titipan-expense-ui.js, dana-titipan-portfolio-render.js, dll) | 45 |

**Sesuai instruksi W: HANYA SA11 yang dikerjakan sesi ini.** SA12-SA18 belum
disentuh sama sekali — 113 dari 123 titik ORIGINAL (di luar aset-owners.js)
masih persis seperti temuan S1588, TIDAK berkurang oleh sesi ini.

## Kenapa aset-owners.js duluan

Prioritas tertinggi sesuai analisis W: form "Atur Porsi Kepemilikan" paling
sering disentuh user aktif, DAN ini file yang sudah dikonfirmasi manual (di
audit S1588) sebagai titik injeksi DOM asli (`_ownerNameFieldHtml()` ->
`listBox.innerHTML=` di `_renderOwnersList()`), jadi risikonya paling nyata
(bukan cuma dugaan dari pola teks).

## Perubahan

**`modules/asset/aset-owners.js`** — 10 titik dimigrasi, pola identik dengan
SA1-SA9 (`onX="Fn(arg,this.value)"` -> `data-onX="Fn" data-onX-args='[arg,"$value"]'`,
dibaca oleh dispatcher yang SUDAH ada & sudah dikunci test sejak SA1:
`modules/shared/features-helpers-global-security.js`,
`_dataActionInputChangeHandler`/`_dataActionResolveArgs`):

1. `_ownerNameFieldHtml()` — input nama pemilik (free-text fallback)
2. `_ownerNameFieldHtml()` — select pilih pemilik (`onOwnerSelectChange`)
3. `_renderOwnersList()` — input Porsi (%)
4. `_renderOwnersList()` — input Nominal (Rp)
5. `_renderOwnersList()` — checkbox "Ini saya" (`$checked`, bukan `$value`)
6. `_ownerSettlementFieldHtml()` — select Status Dana
7-9. `_renderRebalancePanel()` — select pilih pemilik manual + 3 radio metode rebalance (proporsional/largest/manual)

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler
dipanggil (dari atribut inline literal ke dataset + dispatcher terpusat).
Semua fungsi `onOwner*`/`setRebalance*` di `Aset` tidak disentuh sama sekali.

## Test

**Baru:** `tests/aset-owners-dynamic-inline-attr-sa11.test.js` (10 test):
- Gate statis permanen: 0 atribut event inline tersisa di file ini (regex
  sama persis dgn audit S1588), + sanity check regex-nya sendiri.
- 5 test markup: `_renderOwnersList()`/`_ownerNameFieldHtml()` nyata
  menghasilkan `data-onX`/`data-onX-args` yang benar (index & token
  `$value`/`$checked` tepat), termasuk cabang select `onOwnerSelectChange`
  (dicek dari sumber langsung, krn skenario test defaultnya registry kosong
  jadi fallback free-text).
- 3 test end-to-end: dataset hasil migrasi diproses lewat dispatcher ASLI
  (bukan re-implementasi, diekstrak dari source file yang sama persis
  seperti `tests/data-oninput-onchange-dispatcher.test.js`) -> membuktikan
  `onOwnerNameInput`/`onOwnerIsSelfToggle`/`onOwnerSettlementChange`
  benar-benar terpanggil dgn argumen tepat & draft ter-update.

**Diperbaiki (regresi dari migrasi ini):**
`tests/asset-owners-flow-e2e-392a-to-392e.test.js` — 2 assertion lama
(`/Aset\.onOwnerNameInput\(0/`) masih cek pola inline lama, diupdate ke
pola `data-oninput`/`data-oninput-args` baru. Tidak ada perubahan makna
test, murni sinkron ke markup baru.

## Hasil build & test

- `node --test tests/*.test.js`: **5671 pass, 0 fail** (baseline 5656 +
  5 test baru fuel-price-ref + 10 test baru SA11 = 5671, cocok).
- `node scripts/build.js`: versi **1591 -> 1592**
  (`s1591-simpleautocomplete-onfocus-generic-dispatch` ->
  `s1592-simpleautocomplete-onfocus-generic-dispatch`, slug tidak berubah
  krn tidak ada fitur baru bernama, cuma bump otomatis). `app_production.html`,
  `sw.js` (CACHE_NAME), dan versi konstanta di 5 file source disinkronkan
  otomatis. Bundle **TANPA minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` -> OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` -> kedua bundle segar.
- `node tests/verify-release-ready.js` -> **lolos, dengan override manual**
  utk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang) — sandbox tanpa akses jaringan, sama seperti S1587/S1588/S1589.
  **⚠️ Ini override ke-4 berturut-turut untuk 2 gate yang sama** (S1587,
  S1588, S1589, SA11) — sudah ditandai berulang kali di sesi-sesi
  sebelumnya, makin mendesak: jalankan
  `npm install --save-dev eslint esbuild` begitu W kerja di environment
  dengan akses jaringan, lalu `node scripts/build.js` ulang tanpa override.

## File yang berubah (masuk ZIP patch ini — AKUMULASI 2 sesi)

```
modules/asset/aset-owners.js                     (SA11 — 10 titik dimigrasi)
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi sesi ini)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
modules/shared/modules-render.js                 (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1592)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1592)
tests/aset-owners-dynamic-inline-attr-sa11.test.js (BARU, SA11)
tests/asset-owners-flow-e2e-392a-to-392e.test.js  (fix regresi SA11)
tests/fuel-price-ref.test.js                     (sesi fuel-price-ref)
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (log override ke-4)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (BARU, sesi ini)
```

## JANGAN dikerjakan sesi ini (sengaja, sesuai instruksi "1 sesi 1 patch")

SA12-SA18 (113 dari 123 titik audit S1588 yang tersisa di 37 file lain) —
lihat tabel rencana sesi di atas. Urutan berikutnya yang direkomendasikan:
**SA12 (`investasi-view.js`)**, krn skornya sama-sama 10 titik & satu
family fitur (Porsi Kepemilikan) dengan SA11, pola migrasinya kemungkinan
besar mirip persis.

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override ke-4
   berturut-turut untuk gate yang sama.
2. Setelah SA11-SA18 semua tuntas & grep repo-wide S1588 balik 0, baru
   disclaimer CSP "TUNTAS 100%" di `index.html` boleh diperluas cakupannya
   ke seluruh app (bukan cuma 2 file HTML statis), bukan sebelum itu.
3. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka form "Atur Porsi
   Kepemilikan" di Chrome/Edge/Firefox versi lama sebelum SA11 (dari backup
   `app-bundle-*.min.s1591-*.js` di `backups/`) vs versi baru, untuk
   konfirmasi independen bahwa migrasi ini memang memperbaiki masalah nyata
   (bukan cuma lolos gate CSP di atas kertas).
