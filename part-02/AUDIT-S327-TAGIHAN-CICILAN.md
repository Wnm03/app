# Audit S327 — Tagihan / Cicilan / Langganan / Pembayaran / Riwayat / Piutang

## Scope
Audit statis source + regression test untuk alur:
- Bayar sekarang
- Bayar Bulan Depan
- Edit
- Hapus tagihan aktif
- Hapus arsip
- Riwayat pembayaran
- Edit/hapus transaksi pembayaran
- sinkronisasi `billLinkId`
- sinkronisasi `D.bills`, `D.billsArchive`, `D.transactions`, `D.debts`, `D.piutang`
- alur cicilan, tagihan, langganan

## Temuan yang diperbaiki

### 1. CRITICAL — Hapus pembayaran terakhir setelah tunggakan beberapa periode dapat mengembalikan `nextDue` salah
`markBillPaid()` dapat memajukan `nextDue` lebih dari satu periode ketika tagihan menunggak. Sebelumnya `revertBillFromDeletedTx()` hanya mundur satu periode saat transaksi terakhir dihapus.

**Perbaikan:** setiap transaksi pembayaran baru menyimpan `billPrevNextDue`. Saat transaksi terakhir dihapus, `nextDue` dipulihkan persis ke snapshot sebelum pembayaran. Data lama tanpa field ini tetap memakai fallback perilaku lama.

### 2. HIGH — Hapus arsip meninggalkan `billLinkId` yatim
`delBillArchive()` menghapus record arsip tetapi transaksi historis tetap menyimpan `billLinkId` menuju ID yang sudah tidak ada.

**Perbaikan:** transaksi historis tetap dipertahankan, tetapi `billLinkId` dilepas hanya untuk transaksi yang menunjuk arsip tersebut. Ini menjaga integritas referensi tanpa menghapus catatan keuangan.

### 3. UI refresh setelah hapus arsip
Setelah arsip dihapus, tampilan Keuangan/Dashboard ikut direfresh sehingga perubahan referensi tidak tertinggal di UI.

## Yang sudah diaudit dan tidak diubah

- Tombol `✅ Bayar sekarang` sudah menggunakan `billActionPayNow`.
- `📅 Bayar Bulan Depan` menggunakan `billActionPayAdvance`.
- Edit menggunakan `billActionEdit`.
- Riwayat menggunakan `billActionHistory`.
- Hapus aktif menggunakan `billActionDelete`.
- Hapus arsip menggunakan `billActionDeleteArchive`.
- `markBillPaid()` sudah memiliki guard pembayaran ganda.
- `billLinkId` dibuat saat pembayaran dari Tagihan dicatat.
- Penghapusan transaksi memakai `revertBillFromDeletedTx()` sebagai SSOT.
- Sinkronisasi Piutang otomatis dibersihkan ketika sumber transaksi/tagihan dihapus.

## Regression test

`tests/s327-tagihan-sync-integrity.test.js` mengunci:
1. Cicilan menunggak → hapus pembayaran terakhir → `nextDue` kembali persis.
2. Langganan menunggak → hapus pembayaran terakhir → `nextDue` kembali persis.
3. Hapus arsip → transaksi tetap ada, `billLinkId` dilepas.

## Hasil test

- Patch test: **3/3 PASS**
- Seluruh `tests/*.test.js`: **2058/2058 PASS**
- `node --test` seluruh root masih mencoba mengeksekusi `self-test.js` sebagai test file dan gagal karena `self-test.js` membutuhkan browser `window`; ini bukan regresi patch. Suite sebenarnya (`tests/*.test.js`) lulus penuh.

## Rekomendasi berikutnya

1. Tambahkan smoke-test UI nyata untuk setiap tombol Tagihan/Cicilan/Langganan.
2. Tambahkan audit referential-integrity berkala untuk transaksi dengan `billLinkId` yang tidak memiliki pasangan di `D.bills`/`D.billsArchive`.
3. Untuk data lama, jangan otomatis menebak `billPrevNextDue`; gunakan fallback satu periode seperti sekarang dan tandai data legacy bila perlu.
4. Setelah patch ini stabil, baru audit khusus `Bayar Bulan Depan` terhadap pembayaran beberapa periode di muka dan perilaku filter bulan.
