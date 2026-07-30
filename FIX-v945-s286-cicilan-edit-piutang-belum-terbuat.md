# Fix v945 (s286) — Piutang tidak dibuat saat EDIT transaksi cicilan "Ditanggung Bersama"

## Bug yang dilaporkan user
Saat mengedit cicilan yang SUDAH ADA (bukan transaksi baru) dan menyalakan
"Ditanggung Bersama" + "Catat Otomatis sebagai Piutang" lalu Simpan: `existingBill`
ikut ter-update (flag `shared`/`sharedAutoPiutang`/`totalAmount` tersimpan benar), tapi
piutang untuk PEMBAYARAN yang sedang diedit itu sendiri tidak pernah dibuat — piutang
baru mulai muncul di pembayaran BERIKUTNYA (lewat `markBillPaid()`).

## Akar masalah
`modules/finance/transaksi.js`, cabang edit cicilan (`existingBill && curPayMethod===
existingBill.kind`, sub-cabang `isLatestInstallment` untuk `curPayMethod==='cicilan'`):
kode di sana cuma `Object.assign(existingBill,...)` dan `Object.assign(existingTx,...)`,
tidak pernah memanggil `maybeCreateSharedPiutangFromBill()` — beda dengan alur transaksi
cicilan BARU (tenor≥2, saat create) yang sudah memanggilnya (Sesi 341 lanjutan).

## Fix
1. `modules/finance/transaksi.js` — setelah `existingBill`/`existingTx` di-assign di
   cabang edit tsb, panggil `maybeCreateSharedPiutangFromBill(existingBill,
   existingTx.id)` (fungsi ini sendiri sudah cek `b.shared && b.sharedAutoPiutang`
   sebelum bikin apa-apa, jadi aman dipanggil tanpa syarat tambahan).
2. `modules/finance/piutang-utang.js` — tambah guard anti-dobel DI DALAM
   `maybeCreateSharedPiutangFromBill(b, txId)`: skip kalau `D.piutang` sudah punya
   entri dengan `autoTxId` yang sama. Perlu karena transaksi yang sama bisa disimpan
   ulang (mis. edit lagi cuma ganti kategori lalu Simpan lagi) — tanpa guard ini,
   piutang untuk pembayaran yang sama akan tercatat berkali-kali. Guard ini tidak
   mempengaruhi pemanggilan existing per-periode (tiap periode cicilan/langganan
   punya `txId` berbeda, jadi tetap bikin entri piutang baru seperti sebelumnya).

## File yang diubah
- `modules/finance/transaksi.js` — panggilan baru `maybeCreateSharedPiutangFromBill()`
  di cabang edit cicilan.
- `modules/finance/piutang-utang.js` — guard anti-dobel berdasarkan `autoTxId`.
- `tests/shared-bill-auto-piutang.test.js` — test baru: panggil fungsi 2-3x dengan
  `txId` SAMA, pastikan cuma 1 entri piutang yang terbentuk.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`, `index.html`,
  `app_production.html`, `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`, `docs/FILE-MAP.md` — hasil
  `node scripts/build.js s286-fix-cicilan-edit-piutang-belum-terbuat` (build asli).
  Versi 944 → 945 (numerik), label `s286-fix-cicilan-edit-piutang-belum-terbuat`.

## Test
`node --test tests/*.test.js` — 1894 test, semua lolos (1893 lama + 1 baru).
