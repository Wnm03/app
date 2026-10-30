# SA13 (v1593) — Migrasi atribut event inline dinamis di `akun.js` (AccOwners)

**Basis:** app-main baseline v1591 + patch kumulatif `PATCH-fuelpriceref-SA11-SA12-v1592.zip`
(sesi fix-fuelpriceref-harga-sync + SA11 + SA12, sudah di-apply ke proyek penuh).
ZIP patch sesi ini **AKUMULASI** SEMUA sesi sebelumnya — timpa semua file di
dalamnya ke project asli, tidak perlu apply patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (rekomendasi
#3), rencana 8 sesi SA11-SA18 (lihat tabel di
`SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md`). SA11 (`aset-owners.js`,
10 titik) dan SA12 (`investasi-view.js`, 10 titik) sudah tuntas. **SA13 sesi
ini = `modules/finance/akun.js` (bagian `AccOwners`), 7 titik** — persis sesuai
rencana, wiring sejenis SA11/SA12 tapi domain akun bank alih-alih aset/investasi.

## Perubahan

**`modules/finance/akun.js`** — 7 titik dimigrasi, pola identik SA1-SA12
(`onX="Fn(arg,this.value)"` -> `data-onX="Fn" data-onX-args='[arg,"$value"]'`,
dibaca oleh dispatcher yang sudah ada & terkunci sejak SA1:
`modules/shared/features-helpers-global-security.js`,
`_dataActionInputChangeHandler`/`_dataActionResolveArgs`):

1. `_renderList()` — input nama pemilik (`onNameInput`)
2. `_renderList()` — input Porsi (%) (`onPorsiInput`)
3. `_renderList()` — checkbox "Ini saya" (`onIsSelfToggle`, token `$checked`)
4. `_renderRebalancePanel()` — select pilih pemilik manual (`setRebalanceManualOwner`)
5-7. `_renderRebalancePanel()` — 3 radio metode rebalance
   (proporsional/largest/manual, semuanya `setRebalanceMethod`)

Tidak ada perubahan LOGIC apa pun — murni migrasi cara handler dipanggil (dari
atribut inline literal ke dataset + dispatcher terpusat). Semua fungsi
`onNameInput`/`onPorsiInput`/`onIsSelfToggle`/`setRebalanceMethod`/
`setRebalanceManualOwner` di `AccOwners` tidak disentuh sama sekali. Tombol
hapus baris & tombol Terapkan/Batal sudah lebih dulu pakai `data-action` (tidak
dihitung dalam 7 titik SA13 — itu sebabnya SESSION-NOTE-SA11 mencatat SA13
= 7 titik, bukan lebih).

## Test

**Baru:** `tests/akun-accowners-dynamic-inline-attr-sa13.test.js` (9 test),
pola identik SA11/SA12:
- Gate statis permanen: 0 atribut event inline tersisa di `akun.js` (regex
  sama persis dgn audit S1588), + sanity check regex-nya sendiri.
- 4 test markup: `_renderList()`/`_renderRebalancePanel()` nyata menghasilkan
  `data-onX`/`data-onX-args` yang benar (index & token `$value`/`$checked`
  tepat), termasuk ketiga radio metode rebalance & select pemilik manual.
- 4 test end-to-end: dataset hasil migrasi diproses lewat dispatcher ASLI
  (bukan re-implementasi, sama pola dgn `tests/data-oninput-onchange-dispatcher.test.js`)
  -> membuktikan `onNameInput`/`onIsSelfToggle`/`setRebalanceMethod` benar-benar
  terpanggil dgn argumen tepat & draft/pending ter-update.

**Tidak ada regresi** — tidak ada test lama yang cek pola inline literal untuk
`AccOwners.*` (dicek: `tests/rebalance-porsi-pemilik.test.js` dan
`tests/modules-calc-remaining-share-af1.test.js` hanya memanggil fungsi
`AccOwners.*` langsung, tidak lewat regex markup), jadi tidak ada file test
lama yang perlu di-patch seperti SA11 dulu.

## Hasil build & test

- `node --test tests/*.test.js`: **5692 pass, 0 fail** (baseline sebelum sesi
  ini 5683 + 9 test baru SA13 = 5692, cocok).
- `node scripts/build.js`: versi **1592 -> 1593** (slug tidak berubah, cuma
  bump otomatis). `app_production.html`, `sw.js` (CACHE_NAME), dan versi
  konstanta di 5 file source disinkronkan otomatis. Bundle **TANPA
  minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` -> OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` -> kedua bundle segar.
- `node scripts/verify-release-ready.js` -> **lolos, dengan override manual**
  utk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang) — sandbox tanpa akses jaringan, sama seperti sesi-sesi
  sebelumnya. **⚠️ Override berturut-turut untuk 2 gate yang sama** — makin
  mendesak: jalankan `npm install --save-dev eslint esbuild` begitu W kerja
  di environment dengan akses jaringan, lalu `node scripts/build.js` ulang
  tanpa override.

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi sesi ini)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi sesi ini)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi sesi ini)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi sesi ini)
modules/finance/akun.js                          (SA13 — 7 titik dimigrasi, BARU sesi ini)
modules/shared/features-helpers-global-security.js (sinkronisasi versi build.js)
modules/shared/modules-calc.js                   (sinkronisasi versi build.js)
modules/shared/modules-render.js                 (sinkronisasi versi build.js)
chat-action-handlers.js                          (sinkronisasi versi build.js)
app-bundle-a.min.js                              (regenerate, TANPA minifikasi)
app-bundle-b.min.js                              (regenerate, TANPA minifikasi)
index.html                                        (?v= -> 1593)
app_production.html                               (auto-regenerate dari index.html)
sw.js                                             (CACHE_NAME -> v1593)
tests/akun-accowners-dynamic-inline-attr-sa13.test.js (BARU, SA13)
tests/aset-owners-dynamic-inline-attr-sa11.test.js (SA11, tidak diubah lagi)
tests/investasi-view-dynamic-inline-attr-sa12.test.js (SA12, tidak diubah lagi)
tests/asset-owners-flow-e2e-392a-to-392e.test.js  (fix regresi SA11, tidak diubah lagi)
tests/fuel-price-ref.test.js                     (sesi fuel-price-ref, tidak diubah lagi)
tests/s552-investment-owners-nominal-bidirectional.test.js (SA12, tidak diubah lagi)
docs/FILE-MAP.md                                  (regenerated otomatis)
docs/COVERAGE-PER-MODULE.md                       (regenerated otomatis)
docs/RELEASE-GATE-LOG.md                          (log override, auto-append)
docs/CLAUDE.md                                    (entri sesi gabungan sebelumnya, tidak diubah lagi sesi ini)
MANIFEST-PATCH-fuelpriceref-SA11-SA12.md          (dari sesi sebelumnya, tidak diubah lagi)
SESSION-NOTE-fix-fuelpriceref-harga-sync.md       (sesi fuel-price-ref)
SESSION-NOTE-SA11-aset-owners-dynamic-inline-attr.md (SA11)
SESSION-NOTE-SA12-investasi-view-dynamic-inline-attr.md (SA12)
SESSION-NOTE-SA13-akun-accowners-dynamic-inline-attr.md (BARU, sesi ini)
```

## JANGAN dikerjakan sesi ini (sengaja, sesuai instruksi "1 sesi 1 patch")

SA14-SA18 (103 dari 123 titik audit S1588 yang tersisa di 36 file lain):

| Sesi | Cakupan | Titik |
|---|---|---|
| SA14 | `investasi-list-view.js` + `aset.js` | 4+4 |
| SA15 | preview import (vehicle-catalog-import-ui.js, honda-pdf-import-ui.js, vehicle-catalog-web-import-ui.js, shop-scan-ui.js, shop-pdf-import-ui.js) | 22 |
| SA16 | dashboard settings (3× modules-render.js + dashboard-hub-settings.js) | 17 |
| SA17 | cashflow-projection-presenter.js, tx-bbm.js, cicilan.js, tx-stok-sparepart.js | 8 |
| SA18 | 18 file sisa tersebar (aset-reports.js, titipan-expense-ui.js, dana-titipan-portfolio-render.js, dll) | 45 |

Rekomendasi berikutnya: **SA14 (`investasi-list-view.js` + `aset.js`)**.

## Rekomendasi tindak lanjut lain

1. `npm install --save-dev eslint esbuild` — makin mendesak, override
   berturut-turut untuk gate yang sama sejak beberapa sesi lalu.
2. Setelah SA11-SA18 semua tuntas & grep repo-wide S1588 balik 0, baru
   disclaimer CSP "TUNTAS 100%" boleh diperluas cakupannya ke seluruh app.
3. **Belum diuji di browser sungguhan** (sandbox ini tidak ada akses
   browser) — kalau W punya kesempatan, coba buka form "Atur Porsi
   Kepemilikan" di modal Akun di Chrome/Edge/Firefox versi lama vs versi
   baru, untuk konfirmasi independen.
