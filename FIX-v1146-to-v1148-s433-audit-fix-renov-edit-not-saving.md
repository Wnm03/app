# FIX v1146 -> v1148 (s433) — Audit & perbaikan panel "🔨 Catat juga ke Proyek Renovasi?" saat Edit Transaksi

## Konteks

Laporan user: tombol/panel "🔨 Catat juga ke Proyek Renovasi?" di modal Edit
Transaksi bisa dicentang (pilih proyek + status), tapi centangnya TIDAK
tersimpan setelah tap Simpan — tidak ada item baru muncul di proyek
Renovasi, tidak ada error/toast, seolah tap Simpan tidak melakukan apa-apa
soal panel ini. Juga dilaporkan "ada bug di modal" secara umum pada modal
yang sama.

## Root cause

`modules/finance/transaksi.js` (`_saveTxInner()`) memanggil
`applyTxRenovFromTx()` — fungsi yang benar-benar membuat item Renovasi baru
& menautkannya ke transaksi — dengan guard:

```js
if(!existingTx && typeof applyTxRenovFromTx==='function')applyTxRenovFromTx(...);
```

`existingTx` hanya `null`/falsy untuk transaksi **baru**; begitu user
membuka **Edit Transaksi** (transaksi lama), `existingTx` selalu truthy,
jadi baris ini SELALU di-skip — apa pun isian panel Renov (checkbox,
proyek, status) diam-diam diabaikan sepenuhnya. Panel lain dengan pola
serupa (`applyTxStockFromTx`, `applyTxBbmFromTx`, `applyTxShopStockFromTx`,
`applyTxShopSaleFromTx`) TIDAK punya guard `!existingTx` ini — masing-masing
selalu dipanggil & menangani sendiri perbedaan new-vs-edit lewat parameter
`existingTx` yang diteruskan ke dalamnya. Panel Renov adalah SATU-SATUNYA
yang lupa mengikuti pola ini, sehingga jadi satu-satunya yang rusak saat
edit.

Ini bug lama (ada sejak fitur panel Renov pertama dibuat), bukan regresi
dari sesi s432 sebelumnya — ditemukan lewat audit terpisah sesuai laporan
user kali ini.

## Perbaikan

Guard diubah supaya `applyTxRenovFromTx()` tetap dipanggil saat edit,
SELAMA transaksi yang diedit belum pernah ter-link ke item Renovasi
manapun:

```js
if((!existingTx||!existingTx.renovItemLinkId)&&typeof applyTxRenovFromTx==='function')
  applyTxRenovFromTx(note,savedTxId,date,amt,cat,accId);
```

- Transaksi **baru** (`existingTx` null): perilaku SAMA seperti sebelumnya,
  tidak berubah.
- Transaksi **diedit, belum pernah ter-link ke Renov**: sekarang kalau
  panel dicentang + proyek dipilih + status "✅ Sudah Dibeli", item
  Renovasi baru dibuat & ditautkan ke transaksi ini — sama persis seperti
  alur transaksi baru. Kalau statusnya "🛒 Belum Dibeli" atau checkbox
  tidak dicentang, tidak terjadi apa-apa (sama seperti sebelumnya,
  `applyTxRenovFromTx()` sendiri sudah menangani early-return untuk
  kasus-kasus ini — lihat `tx-renov.js`).
- Transaksi **diedit, SUDAH ter-link ke Renov sebelumnya**
  (`existingTx.renovItemLinkId` ada): `applyTxRenovFromTx()` di-SKIP
  (guard baru mencegahnya) supaya tidak membuat item Renovasi KEDUA untuk
  transaksi yang sama — re-sync harga/tanggal/kategori untuk kasus ini
  sudah ditangani terpisah & tetap jalan seperti biasa lewat
  `Renov.onLinkedTxEdited()` (baris lain di `_saveTxInner`, tidak
  disentuh sesi ini).

File yang diubah: `modules/finance/transaksi.js` (1 baris kondisi + komentar
BUGFIX), `modules/finance/tx-renov.js` (update komentar dokumentasi header
supaya tidak lagi menyesatkan pembaca berikutnya).

## Soal "ada bug di modal" (laporan kedua)

Diaudit menyeluruh titik-titik lain di sekitar panel Renov pada `txModal`
(populate select proyek, toggle field, reset checkbox saat kategori
diganti, reset checkbox saat `editTx()` dibuka, urutan panggilan di
`_saveTxInner`) — TIDAK ditemukan bug modal terpisah lainnya di jalur ini.
Kesimpulan sementara: laporan "bug di modal" merujuk ke gejala yang SAMA
dengan bug utama di atas (centang di modal Edit Transaksi yang terasa
"tidak berfungsi/tidak tersimpan"), bukan bug kedua yang berbeda. Kalau
ternyata masih ada perilaku aneh lain di modal ini setelah update, kabari
detail langkahnya (kategori transaksi apa, status apa yang dipilih, dsb)
supaya bisa diaudit lebih spesifik.

## Yang SUDAH BENAR (diverifikasi, tidak diubah)

- `handleTxRenovBelumDibeli()` (status "🛒 Belum Dibeli") SENGAJA tetap
  cuma berlaku untuk transaksi baru (`!txEditId`) — ini pola yang benar
  dan disengaja (item belum lunas + transaksi Keuangan sengaja tidak
  dicatat, tidak masuk akal dipasangkan ke transaksi yang sudah ada &
  sudah tercatat sebelumnya sebagai transaksi nyata).
- `Renov.onLinkedTxEdited()` — re-sync harga/kategori/akun/tanggal untuk
  transaksi yang sudah ter-link, sudah benar & tidak disentuh.
- Reset checkbox `txAddRenov` ke unchecked tiap kali `editTx()` dibuka
  (`modules/finance/transaksi.js`) — pola yang sama dipakai panel Stok
  Sparepart, disengaja (checkbox bukan indikator status link yang sudah
  ada, cuma "mau linkkan lagi/baru sekarang?").

## Test (nyata, dijalankan)

`tests/s433-tx-renov-edit-save-fix.test.js` — 3 test BARU, load SOURCE ASLI
`modules/finance/transaksi.js` lewat VM harness (`loadSource`), memanggil
`_saveTxInner()` sungguhan dengan `applyTxRenovFromTx`/`Renov.onLinkedTxEdited`
di-mock untuk menangkap pemanggilan:

1. Edit transaksi kategori "Renov" yang **belum** ter-link + panel
   dicentang → `applyTxRenovFromTx` HARUS terpanggil 1x dengan `txId`/`amt`
   yang benar; `Renov.onLinkedTxEdited` TIDAK boleh terpanggil.
2. Edit transaksi yang **sudah** ter-link (`renovItemLinkId` ada) →
   `applyTxRenovFromTx` TIDAK boleh terpanggil lagi (cegah item dobel);
   `Renov.onLinkedTxEdited` tetap terpanggil untuk re-sync.
3. Regresi: transaksi BARU (bukan edit) → `applyTxRenovFromTx` tetap
   terpanggil seperti perilaku lama (tidak berubah).

Full suite: **2892/2892 test `node --test` lulus** (naik dari 2889, +3 test
baru session ini), termasuk seluruh test lama yang menyentuh
`_saveTxInner()`/`transaksi.js` (mis. `s316-tagihan-tx-edit-billlink-sync`)
— tidak ada regresi.

## Release gate

- `lint`: override dipakai (eslint tidak bisa diinstall, sandbox tanpa
  akses jaringan) — konsisten sesi-sesi sebelumnya.
- `minify`: override dipakai (esbuild tidak terpasang, sandbox tanpa akses
  jaringan) — bundle unminified 100% valid (`node --check` lolos).
- `html-sync`: lolos normal.

Versi: v1146 → v1147 (build percobaan pertama, label salah) → **v1148**
(`s433-audit-fix-renov-edit-not-saving`, label final). Backup bundle lama
tersimpan otomatis di `backups/`.
