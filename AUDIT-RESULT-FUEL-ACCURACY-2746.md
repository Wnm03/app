# Audit Fuel Accuracy — Build 2746

## Baseline dan cakupan
- Baseline: `app-main (3).zip`.
- Patch kumulatif: seluruh perubahan 2741–2744 dipertahankan.
- Tahap ini menutup celah integritas fuelState saat log BBM dihapus atau diubah.

## Temuan P0 yang dikonfirmasi
FuelState adalah proyeksi turunan dari koreksi manual dan log BBM. Sebelum tahap ini, dua jalur penghapusan BBM menghapus log/transaksi terkait tetapi tidak merekonstruksi `vehicle.fuelState`:
1. Hapus catatan melalui Car Notes (`BBM.del`).
2. Hapus transaksi Keuangan dengan `bbmLinkId` melalui `runTxDeleteCascades()`.

Dampak: fuel bar dapat tetap memakai baseline full-tank yang log sumbernya sudah tidak ada. Perubahan log full-tank menjadi partial juga dapat meninggalkan baseline penuh yang sudah tidak benar.

## Perbaikan
1. Tambah `reconcileFuelStateAfterBbmMutation(vehicleId)` di `modules/finance/tx-bbm.js`.
2. Setelah hapus log dari Car Notes atau cascade hapus transaksi, baseline direkonstruksi dari full-tank valid terbaru yang masih ada.
3. Bila tidak ada full-tank tersisa, koreksi manual terakhir yang masih ada di FuelStateHistory dipulihkan.
4. Bila tidak ada baseline yang dapat dipertanggungjawabkan, `fuelState` turunan dihapus agar UI tidak menampilkan angka lama yang menyesatkan.
5. Koreksi manual yang masih aktif tidak ditimpa oleh rekonsiliasi penghapusan.
6. Edit full-tank menjadi partial memicu rekonsiliasi baseline. Jika baseline manual masih aktif, log partial dihitung di atas baseline itu melalui estimator yang ada.
7. Rekonsiliasi tidak menulis ulang `bbmLogs`, transaksi historis, atau KM historis.

## Pengujian
- Tes baru rekonsiliasi: 6/6 PASS.
- Suite fokus gabungan fuel/BBM, estimator, history, odometer, dan cascade transaksi: 73/73 PASS.
- Build minified: PASS; bundle A/B lolos `node --check`; versi aplikasi sinkron di 2746.
- ESLint pada file yang disentuh: 0 error, 28 warning `no-unused-vars` (pola global dispatcher yang sudah ada).
- Full `npm test` belum mencapai ringkasan akhir dalam batas eksekusi 300 detik. Log menunjukkan satu kegagalan repository yang sudah ada pada kontrak `DELETE-FILES.txt` (5 retired paths masih ada di baseline) dan proses tidak selesai; karena itu full-suite tidak diklaim lulus.
- CSV import/export dan PWA pada perangkat Android nyata belum diuji.

## Risiko / tindak lanjut
- FuelStateHistory menyimpan snapshot manual yang dapat dipulihkan, tetapi metadata snapshot belum menyimpan ID sumber BBM; rekonstruksi memakai tanggal dan status full-tank yang tersisa.
- Konflik beberapa input KM pada tanggal sama masih memerlukan kebijakan urutan yang lebih eksplisit; tanggal saja tidak memberikan urutan jam transaksi.
- Kalibrasi adaptif tetap desain saja, belum diaktifkan.
