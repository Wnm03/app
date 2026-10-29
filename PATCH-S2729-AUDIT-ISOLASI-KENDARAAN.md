# S2729 — Audit isolasi identitas kendaraan dan akumulasi

## Baseline dan lineage
- Input baseline: `app-main (43).zip`.
- Input patch kumulatif: `PATCH-S2728-akumulasi-S2725-S2728.zip`.
- Catatan lineage: dokumentasi S2728 menyebut target `app-main_41 (+S2724)`, bukan app-main (43). Patch ini mengakumulasikan payload S2725–S2728 yang diberikan ke baseline (43), lalu menambah perbaikan S2729. Karena baseline yang dinyatakan patch berbeda, clean replay historis S2725–S2728 tidak diklaim terverifikasi.
- Backup referensi dibaca saja; tidak dimodifikasi.

## Temuan yang diperbaiki
1. `resolveVehicleTxCategory()` sebelumnya fallback ke kategori generik `Transport` bila kategori kendaraan tidak ditemukan. Ini berpotensi menggabungkan transaksi kendaraan berbeda ke kategori yang sama. Sekarang kategori khusus kendaraan dibuat dengan nama kendaraan dan `linkedVehicleId`; kategori `Transport` generik tidak dipakai sebagai identitas kendaraan.
2. Saat panel transaksi dibuka, dropdown BBM/Servis sebelumnya fallback ke kendaraan aktif atau pilihan lama tanpa mempertimbangkan kategori kendaraan yang dipilih. Sekarang `updateTxVehiclePanels()` mengirim ID kendaraan dari `linkedVehicleId` atau nama kategori yang cocok sebagai preferensi konteks.
3. Tidak ada migrasi otomatis terhadap transaksi lama, kategori generik, atau log kendaraan; data historis tidak ditulis ulang.

## Backup (read-only)
- Kendaraan: 5.
- Transaksi: 1.234.
- Riwayat BBM: 120.
- Riwayat servis: 106.
- Katalog kategori sparepart: 250.
- Stok sparepart: 341.
- Kategori pengeluaran: 28; hanya kategori `Vario 125` yang eksplisit memiliki `linkedVehicleId` pada kategori kendaraan yang diperiksa; `Transport` tidak punya `linkedVehicleId`.
- Hash SHA-256 backup: `175aafe8956031012ac6185f4f7c56fb829a4b6dc59871b6d35229df91cfca5c`.

## Verifikasi
- Tes terarah S2725/S2726/S2727/S2728/S2729 dan S2181/service-hardening: 39/39 lulus.
- Sintaks `node --check` untuk file JavaScript yang diubah: lulus.
- `verify-window-expose.js`: lulus, 85 modul.
- Build `node scripts/build.js --require-minify`: lulus setelah memperbaiki permission executable esbuild di workspace; build sinkron ke versi 2710.
- `verify-bundle-freshness.js`: lulus; kedua bundle cocok dengan source.
- Full suite `node --test tests/*.test.js`: TIDAK SELESAI. Proses mencapai setidaknya tes #3022 lalu timeout; tidak ada klaim full suite lulus.
- Audit browser end-to-end untuk penyimpanan isolasi kendaraan, migrasi historis, dan stok sparepart belum dijalankan.

## Keputusan
Status: PARTIAL — perbaikan kode dan build berhasil, tetapi full suite dan replay lineage belum terverifikasi. Jangan menyatakan `0 gap substantif` atau rilis final sampai full suite dan uji browser isolasi kendaraan selesai.
