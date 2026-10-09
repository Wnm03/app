# S2041.6 — Ukur ukuran transfer bundle & durasi tulis IndexedDB (docs-only, 0 source diubah, tetap v2282)

## Ukuran transfer terkompresi (build v2282)
| Bundle | Mentah | gzip -6 | gzip -9 | Brotli q11 |
|---|---:|---:|---:|---:|
| app-bundle-a.min.js | 1.006 KB | 245 KB | 244 KB | 189 KB |
| app-bundle-b.min.js | 2.382 KB | 596 KB | 594 KB | 447 KB |
Total first-load ±841 KB gzip (±636 KB Brotli) untuk kedua bundle, belum termasuk CSS/gambar/lazy script. GitHub Pages menyajikan gzip, jadi angka praktisnya ±841 KB. Setelah itu di-cache SW (CACHE_NAME ber-versi), jadi biaya hanya pada kunjungan pertama dan tiap bump versi. Budget (raw A 1,6 MB / B 5 MB) aman: 64% / 49%.

## Durasi tulis penyimpanan (Chromium, CPU 4x, state penuh via save()+saveFlush())
| Transaksi | Ukuran JSON | save() (debounce) | saveFlush sinkron (stringify+localStorage) | Commit IndexedDB terlihat |
|---:|---:|---:|---:|---:|
| 1.000 | 204 KB | 4 ms | 13 ms | 30 ms |
| 5.000 | 878 KB | 5 ms | 66 ms | 119 ms |
| 20.000 | 3,4 MB | 6 ms | 88 ms | 144 ms |
Kesimpulan: tidak ada masalah. `save()` biasa murah (didebounce); biaya terbesar ada di `saveFlush()` (titik kritis: background/tutup/ekspor), di bawah 100 ms pada 20 ribu transaksi di 4x CPU. Pengukuran polling per 25 ms, jadi angka commit akurat ±25 ms.
Catatan risiko (bukan bug sekarang): saveFlush juga menulis snapshot ke localStorage['kw_v4'] (3,4 MB pada 20k transaksi). Batas localStorage umumnya ±5 MB per origin; sekitar 30 ribu transaksi dengan bentuk data ini akan mendekati batas. Kode sudah punya peringatan `_largeLocalSnapshotWarnShown`; belum diuji perilaku saat quota benar-benar terlampaui.

## Masih terbuka
Uji HP fisik, scroll FPS, daftar stok sparepart & riwayat servis ribuan baris, mode offline/SW, Safari/iOS, perilaku saat quota localStorage terlampaui.
