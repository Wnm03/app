# Sesi 400 — Klarifikasi Label "Biaya Harian" di Saran Alokasi Gaji, v1101 → v1103

## Latar belakang

Potensi salah baca di kartu "💰 Saran Alokasi Gaji" (ditambah Sesi 398):
label "Biaya Hidup Harian: Rp X/bulan (50%)" bisa disalahartikan sebagai
"uang jajan harian" (angka kecil), padahal itu 50% dari TOTAL pemasukan
bulanan (angka besar — jatah biaya hidup keseluruhan, bukan jajan).

## Perubahan

- **`modules/shared/profil-pengaturan.js`** — `renderSalaryAllocationSuggestion()`:
  label diubah dari `"🍽️ Biaya Hidup Harian: ... (50%)"` jadi
  `"🍽️ Biaya Hidup (kebutuhan sehari-hari, bukan \"uang jajan\"): ...
  (50% dari total pemasukan)"`. **Cuma teks tampilan** — 0 perubahan angka/
  kalkulasi (`SalaryAllocation.suggest()` di `modules-calc.js` tidak
  disentuh).

## Kenapa aman

- Tidak menyentuh `SalaryAllocation` (kalkulasi) sama sekali.
- Test `tests/salary-allocation-s398.test.js` cuma assert angka kalkulasi
  (`s.biayaHarian`, dst), bukan string HTML — tidak perlu diubah, tetap PASS.

## Test

Full suite: **2699/2699 pass, 0 fail** (tidak ada test baru, ini murni
copy/label change).

## Build

`node scripts/build.js s400-salary-allocation-label-clarity` → v1103
(versi lompat dari 1101 ke 1103 krn build sempat dijalankan 2x saat sesi
ini — tidak ada dampak fungsional, cuma nomor versi; sintaks bundle valid,
index.html/app_production.html identik).

## Cara pasang (patch)

Timpa file berikut:

```
modules/shared/profil-pengaturan.js
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
```

Ikut berubah (cuma bump versi, 0 logika): `chat-action-handlers.js`,
`modules/shared/multi-owner-engine.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/business/shop-data-io-api.js`,
`modules/shop/generic/product-repository.js`, `modules/shared/modals.js`,
`modules/shared/modules-render.js`, `modules/shared/modules-calc.js`.
