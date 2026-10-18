# Audit & Patch BBM S2601 — Konsumsi Full-to-Full

## Temuan
1. Badge konsumsi di riwayat (`car-notes.js`, `BBM.renderList`) memilih catatan odometer sebelumnya, bukan pengisian FULL TANK sebelumnya. Untuk pola Full Tank → Isi sebagian → Full Tank, rumus badge hanya membagi jarak sejak catatan parsial dengan liter pada pengisian penuh terakhir. Contoh pada screenshot menghasilkan 49,3 km/L (222 km / 4,5 L), padahal angka itu bukan konsumsi segmen full-to-full.
2. Badge dibangun dari `logs` yang sudah dibatasi filter periode. Memilih periode dapat menghilangkan anchor full-tank yang diperlukan dan mengubah/meniadakan hasil badge.
3. Ringkasan rata-rata punya fallback jarak log terakhir dikurangi log pertama dibagi semua liter setelah log pertama, walaupun tidak ada dua anchor Full Tank. Ini menghasilkan angka konsumsi yang tidak memenuhi metode pengukuran.
4. SSOT `getFuelFullTankSegments()` / `estimateRpPerKm()` di `modules/vehicle/vehicle-core.js` sudah mengakumulasi partial fill di antara dua anchor full tank dengan benar. Patch tidak menggandakan rumus SSOT untuk statistik global; perbaikan ditujukan pada perhitungan badge riwayat yang salah dan fallback tanpa anchor.

## Perubahan
- Badge pada riwayat kini mencari FULL TANK sebelumnya dari seluruh histori kendaraan, lalu menjumlahkan semua liter valid dengan odometer `(anchorAwal, anchorAkhir]`.
- Filter periode UI tidak lagi menghapus anchor yang dibutuhkan untuk badge konsumsi.
- Menghapus fallback konsumsi jarak/liter ketika belum ada minimal dua catatan Full Tank. UI menampilkan `-` sampai ada segmen terukur.
- Menambahkan tes regresi S2601 untuk kasus partial fill, anchor Full Tank, dan larangan fallback.

## Contoh screenshot
Untuk anchor 20.859 km dan Full Tank berikutnya 21.310 km, dengan isi sebagian 3,5 L di 21.088 km dan pengisian penuh 4,5 L di 21.310 km:
- Jarak: 451 km
- Liter dalam segmen: 3,5 + 4,5 = 8 L
- Konsumsi segmen: 451 / 8 = 56,375 km/L (≈56,4 km/L)

Nilai ini berlaku jika catatan 20.859 km benar-benar Full Tank dan semua pengisian dalam segmen tercatat lengkap. Ini adalah angka segmen; konsumsi kendaraan jangka panjang sebaiknya memakai agregasi total km / total liter dari seluruh segmen valid.

## Verifikasi
- Tes target BBM/riwayat/transaksi: 566 lulus, 0 gagal.
- Tes regresi baru + standar konsumsi + kualitas data: 13 lulus, 0 gagal.
- Build `npm run build`: lulus setelah memperbaiki permission executable esbuild hanya di lingkungan kerja sementara; output bundle lolos `node --check`, `index.html` dan `app_production.html` sinkron.
- `npm test` penuh dicoba dua kali, tetapi proses melewati batas waktu eksekusi lingkungan saat sekitar 2.400 tes. Karena itu suite penuh belum dapat dinyatakan lulus; tidak ada hasil kegagalan tes yang terkonfirmasi dari percobaan yang terputus.
