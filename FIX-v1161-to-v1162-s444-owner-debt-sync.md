# FIX v1161 → v1162 (s444) — Utang Titipan Basi di Aset Multi-Owner (3 Pemilik)

## Konteks audit
Skenario nyata: aset di Buku Aset dengan 3 pemegang porsi (SELF + 2 pihak
lain), porsi SELF ditautkan ke Akun Keuangan yang dipakai transaksi
sungguhan (riwayat income/expense). Ditemukan 2 bug lewat audit + test real
(lihat `tests/asset-3owners-linked-account-real-tx-audit-s444.test.js`).

## BUG-OWN-001
`syncLinkedAssetNilaiFromAkun()` (dipanggil tiap `save()`, arah sync
Akun→Aset — S422f) sudah benar menarik `a.nilai` dari transaksi riwayat
nyata di akun tertaut, tapi **tidak** memanggil `Aset._syncOwnerDebts()`.
Akibat: utang "dana titipan" milik owner non-SELF (Buku Utang) basi,
merefleksikan nilai aset LAMA — Kekayaan Bersih & Zakat Maal salah hitung.

**Fix**: begitu `nilaiBaru!==a.nilai`, panggil `Aset._syncOwnerDebts(a)`
juga (guard `typeof Aset` supaya fungsi ini tetap bisa dites headless tanpa
`Aset` dimuat, pola sama guard `typeof MultiOwnerEngine` di fungsi yang
sama).

## BUG-OWN-002
`Aset.saveOwners()` (modal ⚖️ Atur Porsi Kepemilikan — S392d/422e) sudah
benar resync saldo akun tertaut ke porsi baru, tapi juga **tidak**
memanggil `_syncOwnerDebts()`. Akibat: ubah split porsi 3 pemilik → saldo
akun benar, tapi utang titipan owner non-SELF tetap di porsi lama.

**Fix**: panggil `Aset._syncOwnerDebts(a)` sebelum `save()` di
`saveOwners()` — pola sama persis jalur `_saveInner()` yang sudah benar.

## File yang berubah
- `modules/asset/aset.js`
- `tests/asset-owners-ai-rules-regression-s392e.test.js` (tambah stub
  `todayStr()` — sekarang dibutuhkan karena `saveOwners()` ikut memanggil
  `_syncOwnerDebts()`)

## Test
- `tests/asset-3owners-linked-account-real-tx-audit-s444.test.js` (5 test,
  audit real 3-owner + akun tertaut + riwayat transaksi nyata)
- Full suite: 2907/2907 pass, 0 regresi

## Build
- v1161 → v1162 (s444)
