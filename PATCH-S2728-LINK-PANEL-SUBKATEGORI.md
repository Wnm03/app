# S2728 — Panel tautan (BBM/Servis/Sparepart/Renovasi) mengenali kategori & subkategori

Patch AKUMULATIF S2725 + S2726 + S2727 + S2728 (build 2709). Timpa ke atas baseline app-main_41 (+S2724). Catatan S2727: lihat PATCH-S2727-AKUMULASI-S2725-S2727.md.

## Perbaikan
- `isKendaraanCatName`: kategori bernama bebas ("Supra X", "Avanza") dikenali bila `linkedVehicleId` valid.
- `isBensinSubName(sub, cat)`: regex diperluas (Dexlite, Premium, Fuel, Isi tangki, SPBU) + fallback ID `sub_bensin_*`.
- `isServisSubName(sub, cat)` (baru): servis/service/tune up/ganti oli/oli + fallback ID `sub_servis_*`. Dipakai di `tx-servis.js` dan `transaksi-b.js`.
- `isRenovCatName`: + rehab/bangun rumah/pugar + fallback ID kategori `renov`.
- `updateTxVehiclePanels`: saat EDIT transaksi yang sudah tertaut (`bbmLinkId`/`servisLinkId`), panel BBM/Servis tetap tampil walau nama tak cocok pola.
- `_saveTxInner`: panel dihitung ulang dari teks kategori/sub terkini sebelum simpan (blur 150 ms bisa belum jalan).
- `transaksi-b.js` (S13): log servis TIDAK dihapus bila kategori+sub tidak berubah saat edit.

## Tambahan rekomendasi (sesi yang sama)
- `tukang-absensi.js` (3 jalur): bila kategori upah tidak ditemukan otomatis, tampil toast agar user memilih manual (sebelumnya kosong tanpa kabar).
- `backup-restore.js` (import CSV): heuristik BBM mengenali dexlite/biosolar/fuel, selaras dengan form transaksi.

## Tes
- Baru: `tests/s2728-tx-link-panels.test.js` (15 tes: deteksi, tampilan panel dgn DOM palsu, 2 tes struktur guard S13/saveTx).
- Suite penuh: 9314 tes, 9312 lulus, 1 gagal (S2613, sudah gagal sebelum patch), 1 skip.

## Belum diuji / keputusan
- Belum diuji di browser nyata (blur/Simpan cepat, edit transaksi tertaut). Guard S13 hanya diuji struktur, bukan eksekusi penuh jalur simpan.
- Centang "sinkron BBM" tetap manual (default mati), tidak diubah.
- Panel BBM untuk sub bensin di kategori NON-kendaraan tetap tidak muncul (sengaja, temuan 7 tidak diubah).
