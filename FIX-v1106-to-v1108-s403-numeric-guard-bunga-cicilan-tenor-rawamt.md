# Sesi 403 — Guard Numerik Negatif (Bunga/Cicilan/Tenor/Jumlah Tagihan), v1106 → v1108

## Latar belakang

Audit lanjutan validasi numerik di `modules/finance/`: `nilai` piutang/utang
sudah dijaga `<=0` sejak BUG-FIN-001, tapi field terkait lain di 3 file
belum dapat perlakuan sama — lolos NEGATIF tanpa peringatan:

1. `Debt.save()` (piutang-utang.js) — `bunga` (`parseFloat(...)||0`) &
   `cicilanBulanan` (`parsePzNum(...)`) tanpa guard `<0`. Bunga negatif
   lolos ke `DebtStrategy.simulate()` (proyeksi snowball/avalanche) &
   bikin arah bunga majemuk terbalik; cicilanBulanan negatif bikin saldo
   utang MALAH bertambah tiap bulan simulasi, bukan berkurang.
2. `_saveBillInner()` (tagihan-kalender.js) — guard `if(!name||!rawAmt||!due)`
   cuma nangkap 0/NaN (angka negatif itu truthy di JS), beda dari
   `saveBillHistoryEdit()` di file yang sama yang sudah benar pakai
   `jumlah<=0`. Nominal tagihan negatif bisa tersimpan lewat form utama.
3. `WorthIt.hitung()` (worthit.js) — `tenor` (`parseInt(...)||0`) tanpa
   guard `<0`, bisa lolos ke `_last.tenor` lalu bocor ke field
   `txCicilanTenor` (`d.tenor||6` — negatif tetap truthy, tidak fallback
   ke 6).

Sekalian ditambal 1 gap defensif ringan yang ditemukan sesi yang sama:
`WorthIt.computeScore()` baca `it.price`/`it.hargaNormal` mentah tanpa
`Number(...)||0`, beda dari `renderList()` (total prioritas belanja) yang
sudah defensif — record wishlist lama/korup bisa NaN-poison skor sort.

## Perubahan

- **`modules/finance/piutang-utang.js`** — `Debt.save()`: `bunga` &
  `cicilanBulanan` di-CLAMP ke 0 kalau hasil parse negatif (bukan ditolak
  spt `nilai`, karena 0 itu valid utk keduanya — utang tanpa bunga/tanpa
  cicilan tetap wajar).
- **`modules/finance/tagihan-kalender.js`** — `_saveBillInner()`: tambah
  `if(rawAmt<0){toast(...);return;}` setelah guard existing, konsisten
  dgn `saveBillHistoryEdit()`.
- **`modules/finance/worthit.js`**:
  - `hitung()`: `tenor` di-clamp ke 0 kalau negatif.
  - `computeScore()`: baca `price`/`hargaNormal` via `Number(it.x)||0`,
    pola sama `renderList()`.
- **`tests/piutang-utang-numeric-guard-s403.test.js`** (baru) — 5 test:
  bunga negatif clamp, cicilanBulanan negatif clamp, nilai positif tetap
  apa adanya (0 regresi), bunga 0 tetap valid, `DebtStrategy.simulate()`
  tidak salah arah setelah clamp.
- **`tests/tagihan-kalender-negative-amt-guard-s403.test.js`** (baru) —
  2 test: rawAmt negatif ditolak (tidak tersimpan), rawAmt positif tetap
  tersimpan normal (0 regresi).
- **`tests/worthit-numeric-guard-s403.test.js`** (baru) — 4 test: tenor
  negatif diclamp ke 0, tenor positif tetap apa adanya (0 regresi),
  `computeScore()` dgn price non-numeric tidak menghasilkan NaN,
  `computeScore()` dgn data numerik normal tetap hitung diskon benar
  (0 regresi).

## Kenapa aman

- Semua guard baru CLAMP/reject di titik input (save()), tidak menyentuh
  rumus perhitungan lain di file manapun — 0 perubahan ke jalur bunga/
  cicilan/tenor/jumlah yang SUDAH valid (positif/0).
- `bunga`/`cicilanBulanan`/`tenor` di-clamp ke 0 (bukan ditolak) karena 0
  itu kasus valid (utang tanpa bunga, item baru pending tanpa cicilan
  terisi dulu) — beda dari `nilai`/`rawAmt` yang memang wajib `>0`.
- `computeScore()` fix murni defensif (`Number(n)||0` no-op utk data
  normal yang sudah angka valid), tidak mengubah rumus skor.

## Test

Full suite: **2721/2721 pass, 0 fail** (2710 lama + 11 test baru — 3
fungsi yang diubah kini SAMA-SAMA punya test langsung, bukan cuma
"tidak meregresi test lama").

## Build

`node scripts/build.js s403-numeric-guard-bunga-cicilan-tenor-rawamt` →
v1108, sintaks bundle valid, index.html/app_production.html identik.
(Catatan: esbuild tidak terpasang di environment build ini, jadi bundle
belum diminify — tetap 100% valid & aman dipakai, cuma lebih besar dari
build v1106 yang sudah diminify.)

## Cara pasang (patch)

Timpa file berikut:

```
modules/finance/piutang-utang.js
modules/finance/tagihan-kalender.js
modules/finance/worthit.js
tests/piutang-utang-numeric-guard-s403.test.js
tests/tagihan-kalender-negative-amt-guard-s403.test.js
tests/worthit-numeric-guard-s403.test.js
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
