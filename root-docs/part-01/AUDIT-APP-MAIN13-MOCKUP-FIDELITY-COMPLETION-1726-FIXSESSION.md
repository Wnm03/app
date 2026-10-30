# Audit — App Main 13 / Pro Mockup Fidelity — Sesi Perbaikan 1726

## Scope
Lanjutan AKUMULATIF di atas sesi 1725 (yang sendiri akumulasi dari 1718–1724).
Semua file dari sesi-sesi sebelumnya tetap disertakan apa adanya. Sesi ini
menutup 1 blocker kode yang masih tersisa di `verify-release-ready.js`:
`GATE service-sot-integrity`.

## Fix — sub-check "HISTORY/REMINDER" salah alamat file (scripts/service-sot-integrity-gate.js)
**Akar masalah:** sub-check ini membaca `car-notes.js` sebagai representasi
"history", lalu mengecek apakah file itu mengandung literal `D.servisLogs`.
Ini SELALU gagal — bukan cuma di patch mockup ini, tapi juga di
`app-main (13)` bersih tanpa patch apa pun (sudah dikonfirmasi manual sesi
sebelumnya). Sebabnya: `car-notes.js` sendiri sudah eksplisit bilang di
komentar baris ~532 — "Servis canonical source: modules/vehicle/servis.js
(GROUP_B)." — artinya seluruh logic riwayat servis (baca/tulis
`D.servisLogs`, render riwayat, checklist servis, dst) sudah dipindah ke
`modules/vehicle/servis.js` di sesi refactor arsitektur Servis sebelumnya.
`car-notes.js` sekarang isinya cuma VEHTAX/BBM/Torsi — 0 referensi
`D.servisLogs` — sehingga gate ini mengecek file yang salah (basi, belum
diupdate mengikuti refactor).

**Perbaikan:** `read('car-notes.js')` diganti `read('modules/vehicle/servis.js')`
di `scripts/service-sot-integrity-gate.js`. Dikonfirmasi
`modules/vehicle/servis.js` memang mengandung banyak pemakaian `D.servisLogs`
nyata (bukan cuma buat lolos gate — file ini betulan CRUD utama servis:
simpan log, baca utk render riwayat, dsb).

## Validation (sesi 1726)
- `node scripts/service-sot-integrity-gate.js`: **PASS** (7/7 sub-check,
  termasuk FULL REGRESSION 6785/6785).
- `node scripts/verify-release-ready.js`: turun dari 3 blocker jadi
  **2 blocker**, dan 2 sisanya murni **limitasi environment sandbox** (tidak
  ada akses jaringan buat `npm install eslint`/`esbuild`), BUKAN masalah kode:
  - `lint`: eslint tidak terpasang.
  - `minify`: esbuild tidak terpasang (bundle tetap valid & jalan, cuma belum
    diminify — ukuran lebih besar dari versi lama yang sempat diminify pakai
    esbuild).
  Kalau dijalankan di environment dev W yang ada akses `npm install`, tinggal
  jalankan `npm install` sekali lalu `npm run release-check` ulang —
  seharusnya full PASS.

## File yang berubah sesi ini (di atas akumulasi 1718–1725)
- `scripts/service-sot-integrity-gate.js` (perbaikan path file yang dicek)

Tidak ada file dari sesi 1718–1725 yang dihapus/diturunkan.
