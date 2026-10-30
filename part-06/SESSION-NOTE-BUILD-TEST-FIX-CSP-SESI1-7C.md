# Session Note — Build & Test Fix (lanjutan PATCH-AKUMULASI-SESI1-7c-fix-csp-inline-handlers)

## Task
User minta: "jalankan build test pastikan bundle tidak basi" atas patch
PATCH-AKUMULASI-SESI1-7c-fix-csp-inline-handlers, lalu "perbaiki test gagal".

## Temuan 1 — Bundle basi (root cause)
`modules/shared/modals.js` di patch punya `MODAL_VERSION` yang TIDAK ikut
ter-bump ke versi baru (stuck di `s772-sesi7abc-csp-fix-...`, harusnya
`s773-followup6-...` sama seperti 4 file version-constant lain). Akibatnya
`node scripts/build.js` berhenti di `verifyVersionConstantsSynced()` sebelum
sempat generate bundle baru.

**Fix:** samakan `MODAL_VERSION` secara manual, lalu jalankan ulang
`node scripts/build.js` — sukses sampai versi `s774-...` (lalu `s775-...`
setelah fix test di bawah menambah 1 baris kode). `verify-bundle-freshness.js`
sekarang PASS untuk kedua bundle.

## Temuan 2 — 6 test lama pakai pola inline onchange yang sudah dimigrasi
Test `fuel-jenis-dropdown-s750`, `fuel-jenis-wiring-s753`,
`fuel-ref-modal-s751`, `fuel-ref-modal-s752` masih menagih pola
`onchange="FuelPriceRef.onSelectChange(...)"` inline, padahal patch CSP-fix
sesi ini sengaja mengganti SEMUA inline handler jadi
`data-onchange="onBbmJenisChange"` / `data-onchange="onTxBbmJenisChange"`
(wrapper function yang memanggil `FuelPriceRef.onSelectChange(...)` di
runtime — lihat `modules/finance/tx-bbm.js` & fungsi sejenis di
modules/vehicle). Dikonfirmasi oleh test BARU `sesi7c-vehiclemodal-simmodal-
inline-attr.test.js` di patch yang sama, yang justru mengharapkan pola
`data-onchange`.

**Fix:** update ke-4 file test di atas supaya regex/assert mengecek
`data-onchange="onBbmJenisChange"` / `data-onchange="onTxBbmJenisChange"`,
bukan pola inline lama.

## Temuan 3 — Regresi asli: `window.Debt = Debt;` hilang dari piutang-utang.js
Test baru `sesi7a-debtmodal-piutangmodal-inline-attr.test.js` (bagian dari
patch ini) menagih `window.Debt = Debt;` (guarded) di
`modules/finance/piutang-utang.js` supaya dispatcher generik
(`data-onchange="Debt.onJenisChange"` di `debtJenis` select) bisa resolve
`Debt` lewat `window[...]` — tapi baris itu TIDAK PERNAH ADA di source
repo (bug beneran, bukan cuma test basi: tanpa expose ini, dropdown
`debtJenis` di form Tambah Utang gagal senyap di browser sungguhan juga).

**Fix:** tambahkan baris expose di `modules/finance/piutang-utang.js`
persis setelah deklarasi `const Debt={...}`:
```js
if(typeof Debt!=='undefined') window.Debt=Debt;
```

## Hasil akhir
- `node --test tests/*.test.js` → 6005/6005 PASS (sebelumnya 5996 pass/9 fail).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar.
- `node scripts/verify-release-ready.js` → lolos (lint & minify di-override,
  eslint/esbuild tidak tersedia di sandbox tanpa akses npm registry).

## File yang berubah sesi ini (di atas patch CSP-fix asli)
- `modules/shared/modals.js` — fix `MODAL_VERSION` + hasil bump build.js
- `modules/finance/piutang-utang.js` — tambah `window.Debt = Debt;` guard
- `tests/fuel-jenis-dropdown-s750.test.js`
- `tests/fuel-jenis-wiring-s753.test.js`
- `tests/fuel-ref-modal-s751.test.js`
- `tests/fuel-ref-modal-s752.test.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js`, `FILE-MAP.md`, `COVERAGE-PER-MODULE.md`
  — hasil rebuild (versi s775, ?v=1636)
