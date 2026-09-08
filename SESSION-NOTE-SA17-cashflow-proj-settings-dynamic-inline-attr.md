# SA17 (v1598) — Migrasi atribut event inline dinamis di panel "⚙️ Atur" Proyeksi Arus Kas

**Basis:** app-main baseline v1591 + patch akumulasi
`PATCH-fuelpriceref-SA11-SA12-SA13-SA14ab-SA15-SA16-v1597.zip` yang sudah
diupload sebelumnya (sesi fix-fuelpriceref-harga-sync + SA11..SA16, sudah
di-apply ke proyek penuh). ZIP patch sesi ini **AKUMULASI** SEMUA sesi
sebelumnya — timpa semua file di dalamnya ke lokasi yang sama persis di
project asli, tidak perlu apply patch-patch sebelumnya terpisah lagi.

## Latar belakang

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md`
(rekomendasi #3), rencana 8 sesi SA11-SA18. SA11-SA16 sudah tuntas, 84 dari
123 titik audit. Rencana SA17 (dicatat di tabel "Next TODO"
`SESSION-NOTE-SA16-dashboard-settings-dynamic-inline-attr.md`) menyebut 4
file / 8 titik: `modules/finance/cashflow-projection-presenter.js`,
`tx-bbm.js`, `cicilan.js`, `tx-stok-sparepart.js`.

## Audit ulang (temuan penting — angka "8 titik" di tabel lama ternyata bias)

Sebelum eksekusi, ke-4 file dicek satu-satu isinya (bukan cuma percaya angka
di tabel lama — sesuai peringatan yang sudah dicatat sebelumnya di
`docs/CLAUDE.md`: "cek ulang daftar ini ... jangan cuma percaya daftar
tercatat, sudah kejadian 1x kelewat"). Regex audit S1588
(`(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="`)
murni tekstual — **tidak membedakan kode asli dari komentar** yang
kebetulan menyebut pola lama sebagai dokumentasi:

| File | Kemunculan regex | Kode ASLI (butuh migrasi) | Komentar (bukan titik nyata) |
|---|---|---|---|
| `cashflow-projection-presenter.js` | 4 | **3** (`_fillSettingsPanel()`) | 1 (baris komentar soal `keuFilterPanel`) |
| `tx-bbm.js` | 2 | 0 | 2 (menjelaskan pemanggil di `modals.js`) |
| `cicilan.js` | 1 | 0 | 1 (menjelaskan pemanggil di `modals.js`) |
| `tx-stok-sparepart.js` | 1 | 0 | 1 (menjelaskan pemanggil di `modals.js`) |

`tx-bbm.js`, `cicilan.js`, dan `tx-stok-sparepart.js` murni file logic (tidak
membangun string HTML apa pun sendiri) — field yang disebut di komentarnya
(`txCicilanNama`, `txBbmVehicle`, `txStockItem`) markup-nya ada di
`modules/shared/modals.js`, file terpisah yang **TIDAK masuk 38 file di
tabel audit S1588** sama sekali (`modals.js` menulis atribut sbg `\"`
ter-escape di dalam string JS berkutip-tunggal, sehingga tidak cocok dengan
regex audit yang mencari `="` tanpa backslash — blind spot metodologi lama,
dicatat di sini bukan untuk diperbaiki sesi ini, migrasi `modals.js` di
luar cakupan SA11-SA18 sama sekali).

**Kesimpulan: migrasi nyata sesi ini cuma 3 titik**, bukan 8 — SEMUANYA di
`cashflow-projection-presenter.js._fillSettingsPanel()`.

## Perubahan

Pola migrasi (varian "0 argumen", sama seperti varian ke-3 SA16 —
`_dashCashProjSetXxx`/`toggleSettings`/`resetSettings`: fungsi baca DOM
sendiri lewat `getElementById()`, dispatcher default ke args kosong `[]`
kalau `data-onchange-args` tidak ada):

```
onchange="CashFlowProjectionPresenter._onMonthsChange()"
  -> data-onchange="CashFlowProjectionPresenter._onMonthsChange"
onchange="CashFlowProjectionPresenter._onAccChange()"
  -> data-onchange="CashFlowProjectionPresenter._onAccChange"
onchange="CashFlowProjectionPresenter._onCycleDayChange()"
  -> data-onchange="CashFlowProjectionPresenter._onCycleDayChange"
```

1 file diubah: `modules/finance/cashflow-projection-presenter.js` (3
titik, semuanya di dalam `_fillSettingsPanel()`). Tidak ada perubahan LOGIC
apa pun — murni migrasi cara handler dipanggil. Fungsi
`_onMonthsChange`/`_onAccChange`/`_onCycleDayChange` sendiri tidak disentuh
sama sekali (tetap baca `getElementById('cfpMonths'/'cfpAcc'/'cfpCycleDay')`
persis seperti sebelumnya).

`tx-bbm.js`, `cicilan.js`, `tx-stok-sparepart.js` **TIDAK diubah** — tidak
ada kode nyata untuk dimigrasi di ketiganya (lihat tabel audit ulang di
atas).

## Test

**Baru:** `tests/sa17-cashflow-proj-settings-dynamic-inline-attr.test.js` (9
test):
- Gate literal per titik (bukan gate file-wide seperti SA11-SA16, karena
  file ini sengaja masih punya 1 baris komentar lama yang menyebut pola
  `onchange="..."` — itu teks dokumentasi valid soal `keuFilterPanel`,
  bukan titik yang dimigrasi sesi ini): 0 atribut event inline tersisa
  DI DALAM badan fungsi `_fillSettingsPanel()`.
- Gate sanity: regex-nya sendiri terverifikasi mendeteksi pola asli & tidak
  salah tangkap `data-onchange=`.
- 3 gate literal: `data-onchange="CashFlowProjectionPresenter._onMonthsChange">`
  / `._onAccChange">` / `._onCycleDayChange">` benar-benar ada di source.
- 1 test audit ulang (dokumentasi, bukan cuma klaim): setiap baris yang
  cocok regex inline event di `tx-bbm.js`/`cicilan.js`/`tx-stok-sparepart.js`
  dipastikan berupa baris komentar (`trimmed.startsWith('//')`) — kalau
  suatu saat ada yang menambah kode ASLI baru dengan pola lama di salah
  satu file ini, test ini akan gagal (bukan diam-diam lolos).
- 3 test end-to-end lewat dispatcher ASLI (`_dataActionResolveArgs` +
  `_dataActionInputChangeHandler`, diekstrak dari
  `modules/shared/features-helpers-global-security.js`, **TIDAK** diubah
  lagi sesi ini) memakai objek stub (spy): dataset TANPA
  `data-onchange-args` sama sekali (persis hasil migrasi) → dispatcher
  tetap memanggil `CashFlowProjectionPresenter._onMonthsChange` /
  `._onAccChange` / `._onCycleDayChange` dengan args kosong `[]`.

**Regresi:** `grep -rl` untuk `cfpMonths`/`cfpAcc`/`cfpCycleDay`/
`_onMonthsChange`/`_onAccChange`/`_onCycleDayChange` di seluruh
`tests/*.test.js` → 0 hit selain file test baru sesi ini — **tidak ada
file test lama yang perlu disinkronkan**.

## Hasil build & test

- `node --test tests/*.test.js`: **5789 pass, 0 fail** (baseline sebelum
  sesi ini 5780 + 9 test baru SA17 = 5789, cocok).
- `node scripts/build.js`: versi **1597 -> 1598**. `app_production.html`,
  `sw.js` (CACHE_NAME), dan versi konstanta di 5 file source disinkronkan
  otomatis. Bundle **TANPA minifikasi** (esbuild tidak ada di sandbox ini).
- `node scripts/verify-window-expose.js` → OK, 78 modul.
- `node scripts/verify-bundle-freshness.js` → OK, kedua bundle segar.
- `node tests/verify-release-ready.js` → **lolos, dengan override manual**
  untuk gate `lint` (eslint tidak terpasang) & `minify` (esbuild tidak
  terpasang). **⚠️ Override ke-9 berturut-turut untuk 2 gate yang sama**
  (S1587, S1588, S1589, SA11, SA12, SA13, SA14a, SA14b, SA15, SA16, sekarang
  SA17) — makin mendesak: jalankan `npm install --save-dev eslint esbuild`
  begitu W kerja di environment dengan akses jaringan.

## docs/CLAUDE.md

Diupdate sesi ini dengan 1 entri baru (SA17).

## Progress epic S1588

SA11-SA17 TUNTAS (87 dari 123 titik audit S1588 — 84 dari SA11-16 + 3 titik
nyata SA17; 5 "titik" lain yang sempat tercatat di tabel lama untuk SA17
ternyata false-positive komentar, lihat audit ulang di atas, jadi TIDAK
menambah hitungan). SA18 (rencana lama: "18 file sisa, 45 titik") perlu
diaudit ulang dulu dengan cara yang sama (pisahkan kode asli dari komentar)
sebelum dieksekusi — kemungkinan besar hitungan 45 titik itu juga bias oleh
masalah yang sama, jadi jumlah titik NYATA yang tersisa kemungkinan lebih
kecil dari 45. Rekomendasi sesi berikutnya: jalankan ulang audit S1588
dengan filter "baris tidak diawali `//`" sebelum menentukan cakupan SA18.

## File yang berubah (masuk ZIP patch ini — AKUMULASI SEMUA sesi sejak baseline v1591)

```
modules/vehicle/fuel-price-ref.js                (sesi fuel-price-ref, tidak diubah lagi)
modules/shared/modals.js                         (sesi fuel-price-ref, tidak diubah lagi)
modules/asset/aset-owners.js                     (SA11, tidak diubah lagi)
modules/asset/investasi-view.js                  (SA12, tidak diubah lagi)
modules/finance/akun.js                          (SA13, tidak diubah lagi)
modules/asset/investasi-list-view.js             (SA14a, tidak diubah lagi)
modules/asset/aset.js                            (SA14b, tidak diubah lagi)
modules/vehicle/vehicle-catalog-import-ui.js     (SA15, tidak diubah lagi)
modules/vehicle/honda-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/vehicle/vehicle-catalog-web-import-ui.js (SA15, tidak diubah lagi)
modules/business/shop-scan-ui.js                 (SA15, tidak diubah lagi)
modules/business/shop-pdf-import-ui.js           (SA15, tidak diubah lagi)
modules/shared/modules-render.js                 (SA16 + version-sync, tidak diubah lagi selain versi)
modules/shop/modules-render.js                   (SA16, tidak diubah lagi)
modules/modules-render.js                        (SA16, tidak diubah lagi)
modules/dashboard-hub/dashboard-hub-settings.js  (SA16, tidak diubah lagi)
modules/finance/cashflow-projection-presenter.js (SA17 — SESI INI, 3 titik migrasi)
modules/shared/modals.js                         (version-sync, konstanta saja)
modules/shared/modules-calc.js                   (version-sync, konstanta saja)
chat-action-handlers.js                          (version-sync, konstanta saja)
features-helpers-global-security.js -> modules/shared/features-helpers-global-security.js (version-sync)
```
