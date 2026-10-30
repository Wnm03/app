# Audit Mendalam S2358–S2360 — Performance & Regression

## Ruang lingkup dan metode

Audit statis dilakukan pada baseline `app-main (52)` setelah overlay patch kumulatif S2341–S2357. Pemeriksaan mencakup matcher anggaran rollover, siklus hidup listener, pola I/O runtime, duplikasi simbol, dan ketahanan tes. Audit statis bukan pengganti profiling Android/WebView atau pengujian penuh.

## S2358 — Anggaran rollover: pencocokan kategori pada rentang yang relevan

### Temuan

`Budget.getEffectiveLimit()` sebelumnya memanggil `Budget.matchesTx()` sebelum memeriksa apakah transaksi berada di bulan sebelumnya. `matchesTx()` menyelesaikan metadata kategori, sehingga transaksi dari bulan lain dapat memicu pencarian kategori yang tidak berkontribusi pada perhitungan rollover.

### Perbaikan

- Periksa objek transaksi dan tanggal bulan sebelumnya terlebih dahulu.
- Lewati transaksi non-pengeluaran sebelum membangun matcher.
- Bangun matcher kategori secara lazy, maksimal sekali untuk satu pemanggilan rollover.
- Tidak menggunakan cache lintas pemanggilan; perubahan kategori tetap terlihat pada render berikutnya.
- Rumus rollover dan penjumlahan nominal yang ada tidak diubah.

### Validasi

Tes baru membuktikan hasil rollover tetap sama, metadata kategori hanya diselesaikan untuk transaksi pengeluaran bulan sebelumnya, dan perubahan kategori terlihat pada pemanggilan berikutnya.

## S2359 — Siklus hidup listener lightbox foto servis

### Temuan

`Servis._closePhotoLightbox()` keluar lebih awal ketika elemen overlay sudah tidak ada. Jika jalur UI lain telah menghapus overlay lebih dahulu, listener `keydown` global yang dipasang untuk tombol Escape dapat tetap terpasang.

### Perbaikan

Penutupan kini menghapus overlay bila masih ada, tetapi selalu melepas handler `keydown` dan mengosongkan referensinya. Tes regresi mensimulasikan overlay yang sudah dihapus oleh jalur lain dan memastikan listener dilepas.

## S2360 — Temuan audit statis dan batas interpretasi

- Pemeriksa listener menemukan 132 lokasi `addEventListener`. Hitungan ini bukan jumlah listener runtime dan tidak membuktikan kebocoran; banyak lokasi bersifat singleton, berbasis lifecycle, atau hanya dipasang ketika komponen dibuat.
- Pemeriksa hygiene tes menemukan 43 pola yang berpotensi rapuh karena memeriksa literal/susunan sumber. Ini adalah temuan advisory; tidak semuanya salah dan tidak diubah massal karena berisiko merusak kontrak regresi yang valid.
- Kontrak ukuran sumber GROUP_B diperbarui berdasarkan pengukuran kumulatif saat ini: 4.910.049 byte (sebelumnya 4.908.340). Ini hanya memperbarui snapshot audit sumber; bundle produksi tetap belum segar dan tidak dinyatakan siap rilis.
- Pemeriksa duplikasi menemukan 264 nama simbol berulang pada 514 file JavaScript. Banyak yang merupakan salinan domain/bundle atau implementasi terisolasi; jangan digabung tanpa peta load-order dan boundary arsitektur.
- Pemeriksa I/O statis menghitung 104 pola storage, 284 pola JSON, 11 pola service-list, 17 pola reminder, dan 265 pola save. Heuristik menangkap komentar dan helper, jadi angka ini tidak diperlakukan sebagai pengukuran performa runtime.

## Pekerjaan lanjutan yang masih diperlukan

1. Profiling perangkat Android/WebView untuk startup, perpindahan tab, modal, serta data besar.
2. Jalankan seluruh tes dari toolchain proyek.
3. Bangun ulang bundle A/B dan jalankan freshness/version/release gates. Tes S1930/S1974 masih gagal karena bundle A/B yang ada stale.
4. Tinjau 43 tes advisory satu per satu, ubah hanya jika pengujian perilaku yang setara tersedia.

## Hasil validasi aktual

- **31 tes terfokus lulus**, termasuk S2333–S2347 yang relevan, S2252, S2358, dan siklus lightbox S1780/S1783/S2359.
- Pemeriksaan sintaks `node --check` untuk `budget.js` dan `modules/vehicle/servis.js` lulus.
- Audit kontaminasi dan integritas arsip ZIP lulus; tidak ada bundle produksi dalam patch.
- Percobaan tes penuh dengan runner ber-shard tidak selesai sebelum batas waktu lingkungan. Shard yang sempat berjalan menunjukkan kegagalan S1930 dan S1974 karena bundle A/B usang; snapshot ukuran GROUP_B S2252 sudah diperbarui dan tes individualnya lulus. Ini bukan hasil tes penuh yang hijau.
- `node scripts/build.js --require-minify` berhenti pada preflight karena `esbuild` tidak tersedia; tidak ada bundle yang dihasilkan atau versi yang dinaikkan.
- `verify-bundle-freshness.js` gagal untuk bundle A dan B. Gerbang anggaran ukuran lulus, tetapi beberapa aset hampir menyentuh batas, termasuk `app_production.html` (99,995% dibulatkan menjadi 100,0%) dan `pwa-ui-layer.css` (99,9%).

## Status

Perbaikan source S2358 dan S2359 sudah diuji terfokus. Seluruh suite, build produksi, dan uji perangkat belum dinyatakan lulus. Patch tetap `SOURCE-NOT-RELEASE` sampai toolchain dipulihkan, bundle dibangun ulang, freshness/version/release gates lulus, dan tes penuh selesai.
