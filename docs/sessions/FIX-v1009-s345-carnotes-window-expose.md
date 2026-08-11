# FIX v1009 / Sesi 345 — Tombol Car Notes (BBM/Servis/Torsi) tidak bereaksi, 0 toast

## Laporan

Tombol-tombol di Car Notes tidak merespons klik sama sekali, tanpa error di
console dan tanpa toast apapun.

## Root Cause

Di `car-notes.js`, tiga objek fitur — `BBM`, `Servis`, dan `Torsi` —
dideklarasikan sebagai `const BBM={...}`, `const Servis={...}`,
`const Torsi={...}`.

Di script biasa (bukan ES module), `const`/`let` top-level **tidak
otomatis** menjadi properti `window` (beda dengan `function`/`var`
top-level, yang otomatis jadi properti `window`). Dispatcher klik global
(`modules/shared/features-helpers-global-security.js`) selalu resolve
`data-action="Owner.method"` lewat `window[Owner][method]`. Karena
`window.BBM`/`window.Servis`/`window.Torsi` tidak pernah ada, semua tombol
yang `data-action`-nya berbentuk `BBM.xxx`/`Servis.xxx`/`Torsi.xxx` gagal
diam-diam — tidak ada error karena dispatcher hanya `return` kalau
`window[Owner]` undefined.

Tombol yang kena: chip rekomendasi part di form Servis, semua interaksi di
modal Kalkulator Torsi (pilih kategori, toggle checklist, mode kalkulator,
dst), dan tombol-tombol lain di tab BBM.

Pola bug ini persis yang pernah terjadi & diperbaiki sebelumnya untuk
`FuelModal`/`FuelBarCorrection`/`FuelTankProfileUI` (lihat komentar di
`modules/vehicle/fuel-modal.js`) — kali ini kelewat untuk BBM/Servis/Torsi.

## Fix

Tambah 3 baris ekspos ke `window`, tepat setelah tiap deklarasi objek
selesai di `car-notes.js`, mengikuti pola comment yang sudah ada di
`fuel-modal.js`:

```js
if (typeof BBM !== 'undefined') window.BBM = BBM;
if (typeof Servis !== 'undefined') window.Servis = Servis;
if (typeof Torsi !== 'undefined') window.Torsi = Torsi;
```

0 perubahan logic/routing lain. 0 field/skema data baru.

## Test

+3 test regresi baru: `tests/car-notes-window-expose-s345.test.js`. Memuat
`car-notes.js` ASLI (bukan re-implementasi) lewat harness `loadSource()`,
lalu verifikasi:
1. `window.BBM`/`window.Servis`/`window.Torsi` ada.
2. Sama-persis (referensi identik) dengan binding lexical-nya.
3. Method-nya bisa di-resolve gaya dispatcher nyata
   (`window['Owner']['method']`).

`node --test tests/*.test.js` → **2270/2270 pass, 0 fail** (2267 lama + 3
baru), dijalankan 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s345-fix-carnotes-window-expose-bbm-servis-torsi` →
sukses, `?v=1009`.

## Temuan tambahan (di luar scope sesi ini)

Pola bug yang sama (`const Owner={...}` tanpa `window.Owner=Owner`)
kemungkinan juga ada di modul lain: `Budget`, `Aset`, `Kasir`, `Payroll`,
`EduFund`, `LinkTx`, `WorthIt`, `LifeBalance`, `Refleksi`, `Pensiun`,
`Etalase`, `Order`, `Sparepart`, dll. Sengaja tidak disentuh sesi ini
(satu fokus per sesi) — rekomendasi kuat untuk sesi audit terpisah, karena
kemungkinan tombol-tombol di modul-modul itu juga 0-reaksi dengan pola gejala
yang sama (tidak ada error, tidak ada toast).
