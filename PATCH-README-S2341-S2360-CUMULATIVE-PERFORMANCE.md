# Patch Kumulatif S2341–S2360 — Source, Belum untuk Rilis

Patch ini mempertahankan isi patch kumulatif sebelumnya dan menambahkan:

- **S2358:** optimasi pencocokan kategori untuk rollover anggaran; matcher dibangun hanya untuk transaksi pengeluaran di bulan sebelumnya dan dipakai ulang selama satu pemanggilan.
- **S2359:** cleanup listener Escape lightbox foto servis tetap dilakukan walaupun overlay sudah lebih dulu hilang dari DOM.
- **S2360:** laporan audit statis untuk listener, pola I/O, duplikasi simbol, dan tes yang berpotensi rapuh.
- Tes regresi baru untuk rollover dan cleanup listener lightbox; snapshot ukuran sumber GROUP_B di S2252 disegarkan ke pengukuran aktual 4.910.049 byte.

## Validasi saat ini

- Tes terfokus pada S2336, S2347, S2358, serta siklus lightbox: **12 lulus, 0 gagal**.
- `node --check budget.js` dan `node --check modules/vehicle/servis.js` lulus.
- Percobaan tes penuh ber-shard belum selesai karena batas waktu; shard yang sempat berjalan menemukan kegagalan S1930/S1974 akibat bundle A/B usang. Tes S2252 individual sudah lulus setelah snapshot ukuran GROUP_B diperbarui.
- Build `--require-minify` dihentikan pada preflight karena `esbuild` tidak tersedia; freshness bundle A/B gagal.
- Pemeriksaan statis bersifat advisory dan tidak menggantikan profiling perangkat.
- Bundle produksi tidak disertakan karena perubahan source belum dibangun ulang.

## Status rilis

**Belum siap dirilis.** Jalankan tes penuh, build produksi dengan toolchain yang dipatok, pemeriksaan bundle freshness/version, seluruh release gates, dan profiling Android/WebView sebelum deploy.
