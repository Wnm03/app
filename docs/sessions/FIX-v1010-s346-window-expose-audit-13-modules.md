# FIX v1010 / Sesi 346 — Audit lanjutan: 13 modul lain juga hilang `window.Owner`

## Konteks

Lanjutan temuan tambahan Sesi 345 yang sengaja tidak disentuh (satu fokus
per sesi): pola `const Owner={...}` top-level tanpa `window.Owner=Owner`
dicurigai juga ada di modul lain.

## Audit

Dicek eksplisit 13 nama modul yang dicurigai: `Budget`, `Aset`, `Kasir`,
`Payroll`, `EduFund`, `LinkTx`, `WorthIt`, `LifeBalance`, `Refleksi`,
`Pensiun`, `Etalase`, `Order`, `Sparepart` — lewat pencarian
`^const NAME={` + verifikasi `window.NAME=` **belum ada** di file yang
sama. **Semua 13 dikonfirmasi memang belum ter-ekspos** — artinya semua
tombol dengan `data-action="Owner.xxx"` di modul-modul ini gagal diam-diam,
persis gejala bug Sesi 345 (BBM/Servis/Torsi).

| Modul | File |
|---|---|
| `Budget` | `budget.js` |
| `Aset` | `modules/asset/aset.js` |
| `Kasir` | `modules/business/kasir.js` |
| `Payroll` | `modules/business/payroll-absensi.js` |
| `EduFund` | `modules/finance/edukasi-dana.js` |
| `LinkTx` | `modules/finance/linktx.js` |
| `WorthIt` | `modules/finance/worthit.js` |
| `LifeBalance` | `modules/home/hidup-seimbang.js` |
| `Refleksi` | `modules/home/refleksi-selfcare.js` |
| `Pensiun` | `modules/shared/modules-calc.js` |
| `Etalase` | `modules/shop/cobek-etalase.js` |
| `Order` | `modules/shop/cobek-order.js` |
| `Sparepart` | `modules/vehicle/sparepart-servis.js` |

## Fix

Sama persis pola Sesi 345: tambah satu baris tepat setelah tiap deklarasi
objek selesai, mis.:

```js
if (typeof Budget !== 'undefined') window.Budget = Budget;
```

0 perubahan logic/routing lain. 0 field/skema data baru.

## Catatan teknis insersi

Titik penutup tiap objek dicari otomatis lewat brace-counting (skrip
audit sekali-pakai, bukan bagian dari `build.js`), lalu diverifikasi
`node --check` per file. Dua kasus butuh koreksi manual:

- **Payroll**: marker `const Payroll={` sempat cocok duga ganda karena
  komentar header file juga menyebut teks yang sama — hasil pertama salah
  sasar menyisipkan baris ke tengah komentar (terdeteksi lewat
  `node --check` gagal). Diperbaiki dgn marker yang di-anchor ke awal baris
  (`\nconst Payroll={`), lalu file dikembalikan ke versi asli dulu sebelum
  ditambal ulang.
- **Sparepart**: objeknya sangat besar (~650 baris, banyak template
  literal bersarang), brace-counter otomatis gagal menemukan titik tutup
  yang tepat. Titik tutup dikonfirmasi manual: baris `};` top-level tepat
  sebelum `const SparepartCsvImport={` berikutnya.

11 modul lain (Budget, Aset, Kasir, EduFund, LinkTx, WorthIt, LifeBalance,
Refleksi, Pensiun, Etalase, Order) berhasil ditambal otomatis tanpa
koreksi manual, semua lolos `node --check` di percobaan pertama.

## Test

+39 test regresi baru: `tests/window-expose-audit-s346.test.js` (13 modul
× 3 assertion — window.Owner ada, identik referensi dgn binding lexical,
method bisa di-resolve gaya dispatcher nyata
`window['Owner']['method']`).

`node --test tests/*.test.js` → **2309/2309 pass, 0 fail** (2270 lama + 39
baru), 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s346-fix-window-expose-audit-13-modules` → sukses,
`?v=1010`.

## Cakupan yang TIDAK termasuk sesi ini

Audit ini hanya mencakup 13 nama yang secara eksplisit dicurigai di Sesi
345. Kemungkinan masih ada objek fitur lain dengan pola sama di modul yang
belum diperiksa — kalau ada laporan tombol 0-reaksi di modul lain, cek dulu
pola ini sebelum menduga penyebab lain.
