# FIX v1150 -> v1152 (s436) — Toast panel Renov ketiban toast generik (bukan bug data, bug UX "terasa gagal")

## Konteks

Lanjutan audit user atas laporan "centang tidak tersimpan" pada panel
"🔨 Catat juga ke Proyek Renovasi?" di modal Transaksi (bug awal sudah
dibenerin s433 — lihat `FIX-v1146-to-v1148-s433-audit-fix-renov-edit-not-saving.md`).

Audit sesi ini membuktikan lewat test integrasi BARU yang menjalankan source
ASLI end-to-end (bukan mock) bahwa:

1. Fix s433 (guard `existingTx.renovItemLinkId`) memang sudah benar, di
   source (`transaksi.js`) maupun kedua bundle.
2. Checkbox reset ke unchecked tiap modal dibuka lagi = disengaja (pola sama
   panel Stok Sparepart) — bukan bug.
3. **Bug nyata**: `applyTxRenovFromTx()` (`tx-renov.js`) toast() sendiri di
   akhir ("🔨 Item ... otomatis dicatat" ATAU "⚠️ Pilih dulu Proyek
   Renovasi-nya"), tapi `_saveTxInner()` (`transaksi.js`) SELALU toast() lagi
   TEPAT SESUDAHNYA ("✅ Transaksi diperbarui/tersimpan"). `toast()` cuma
   pegang 1 elemen DOM (`#toast`, lihat `format-tema.js`:
   `t.textContent=msg`) — toast kedua langsung menimpa toast pertama dalam
   hitungan milidetik. User tidak pernah sempat baca konfirmasi/peringatan
   Renov, walau datanya (atau ketiadaannya, utk kasus peringatan) sebenarnya
   valid di balik layar. Fitur **terasa** gagal padahal tidak — kasus
   peringatan "proyek belum dipilih" lebih parah krn justru pesan itulah
   yang harus terlihat (data memang tidak ikut tercatat).

## Root cause

Dua pemanggil `toast()` berurutan tanpa koordinasi, di titik yang sama
persis dengan pola `txAssetSplitMsg` (info "dibagi ke N pemilik", sesi 394)
yang SUDAH menggabungkan pesannya ke toast final alih-alih toast terpisah —
panel Renov belum pernah diselaraskan ke pola itu.

## Perbaikan

- `applyTxRenovFromTx()` (`modules/finance/tx-renov.js`): tidak lagi
  `toast()` sendiri. Jalur "belum pilih proyek" & jalur sukses sama-sama
  `return` string pesannya. Early-return (panel tidak aktif/status "belum
  dibeli") tetap `return undefined` tanpa pesan, sama seperti sebelumnya.
- `_saveTxInner()` (`modules/finance/transaksi.js`): tampung return value ke
  `txRenovMsg`, gabungkan ke toast final (pola identik `txAssetSplitMsg`).
  Durasi toast diperpanjang ke 4000ms kalau ada `txRenovMsg` (pesan gabungan
  lebih panjang — pola sama dgn toast pesan panjang lain di project, mis.
  `error-handler.js`/`features-helpers-global-security.js`).

File yang diubah: `modules/finance/tx-renov.js`, `modules/finance/transaksi.js`.

## Test

Ditambah `tests/s436-tx-renov-e2e-real.test.js` — BEDA dari
`s433-tx-renov-edit-save-fix.test.js` (yang me-mock `applyTxRenovFromTx()`
sepenuhnya, jadi gap ini tidak pernah tersentuh test manapun sebelumnya):
test baru memuat source ASLI `tx-renov.js` + `transaksi.js` +
`helper-teks.js` bareng lewat `loadSource()` (bukan mock), lalu menjalankan
`_saveTxInner()` end-to-end.

2 test baru:
1. Checkbox dicentang + proyek dipilih → item Renov beneran tercipta &
   tertaut ke transaksi (dibuktikan baca `D.renovProjects[0].items` &
   `D.transactions[0].renovItemLinkId` langsung, bukan asumsi mock), DAN
   cuma 1 toast final yang terpanggil (bukan 2 toast terpisah), isinya
   gabungan "✅ Transaksi tersimpan" + pesan Renov.
2. Checkbox dicentang TAPI proyek belum dipilih → transaksi Keuangan tetap
   tersimpan normal, item Renov TIDAK dibuat, dan peringatan "⚠️ Pilih dulu
   Proyek Renovasi-nya" ikut muncul di toast final yang sama (durasi 4000ms).

Regresi: `s433-tx-renov-edit-save-fix.test.js` (3 test, pakai mock
`applyTxRenovFromTx`) tetap lolos tanpa perubahan — mock-nya return
`undefined` implisit, konsisten dgn kontrak baru (tidak ada pesan). Full
suite: **2897/2897 lolos** (naik dari 2661 di v1150 — termasuk test-test
sesi 433-435 yang belum tercatat di ringkasan lama + 2 test baru sesi ini).

## Build

- `npm test` → 2897/2897 lolos.
- `node scripts/build.js s436-tx-renov-toast-merge-fix` → versi naik
  v1150 → v1152 (lompat 1 krn ada 1 build percobaan dgn nama sesi salah
  yang langsung ditimpa ulang dgn nama benar sebelum dipakai — lihat
  `backups/` kalau perlu bandingkan).
- `verify-window-expose` ✓, `verify-bundle-freshness` ✓ (kedua bundle segar,
  hash cocok source).
- `verify-release-ready` (release gate): 2 gate di-override manual (lint —
  eslint tidak terpasang di sandbox tanpa akses npm registry; minify —
  esbuild tidak terpasang di sandbox tanpa akses jaringan), konsisten dgn
  batasan environment sesi-sesi sebelumnya. Gate `html-sync` lolos normal.
