# Sesi 401 — Perjelas Pesan Kosong-Data di Saran Alokasi Gaji, v1103 → v1104

## Latar belakang

Pesan lama saat `SalaryAllocation.avgMonthlyIncome()` = 0 ("Belum cukup
data transaksi Pemasukan buat hitung rata-rata bulanan. Catat beberapa
transaksi Pemasukan dulu ya.") tidak menjelaskan PENYEBAB paling umum:
user yang mencatat gaji masuk sbg "Transfer" (mis. transfer antar akun)
atau langsung edit saldo akun manual (bukan lewat tombol "+ Masuk") akan
selalu dapat Rp0 tanpa tau kenapa — karena `avgMonthlyIncome()` cuma
menghitung `t.type==='income'`.

## Perubahan

- **`modules/shared/profil-pengaturan.js`** — `renderSalaryAllocationSuggestion()`:
  pesan empty-state diperjelas, sebut eksplisit tipe transaksi yang
  dihitung ("Pemasukan"/"+ Masuk") & 2 penyebab umum kenapa Rp0 (dicatat
  sbg Transfer, atau edit saldo langsung). **Cuma teks tampilan** — 0
  perubahan logika (`SalaryAllocation.avgMonthlyIncome()` tidak disentuh).

## Kenapa aman

- Tidak menyentuh kalkulasi `SalaryAllocation` sama sekali.
- Test `tests/salary-allocation-s398.test.js` assert nilai numerik return
  `avgMonthlyIncome()`/`suggest()`, bukan string pesan UI — tetap PASS
  tanpa perlu diubah.

## Test

Full suite: **2699/2699 pass, 0 fail** (tidak ada test baru, murni copy
change).

## Build

`node scripts/build.js s401-salary-allocation-empty-state-guidance` →
v1104, sintaks bundle valid, index.html/app_production.html identik.

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
