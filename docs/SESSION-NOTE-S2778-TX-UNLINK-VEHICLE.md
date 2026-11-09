# SESSION-NOTE S2778 — Lepas tautan Servis/Belanja + kendaraan stok (O-1..O-3 dari S2777)

Kumulatif di atas S2777 (build 2777 → 2778).

Keputusan:
- O-1: matikan centang Servis pada transaksi tertaut = lepas servis (log dihapus, stok pemakaian kembali) setelah konfirmasi.
- O-2: matikan centang Stok = batalkan belanja (stok dikurangi) setelah konfirmasi; ditolak bila stok sudah terpakai (kecuali pemakaian auto-link, yang dilepas dulu).
- O-3: kendaraan stok = kendaraan panel Servis (bila dicentang) → konteks kategori → kendaraan aktif.

Test: `tests/s2778-tx-unlink-vehicle.test.js` (6) + S2777 (11).
Catatan baseline: 5 test gagal bawaan ZIP app-main_6 (lihat SESSION-NOTE-S2777).
