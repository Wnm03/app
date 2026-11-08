# Fuel Accuracy — Patch kumulatif 2741 → 2749

Baseline tetap `app-main (3).zip`. Paket hanya berisi file yang berubah dibanding baseline; bukan full release.

## Akumulasi 2741–2746
- FuelStateHistory idempotent dan tidak menggusur snapshot penting dengan snapshot identik.
- Sinkronisasi full tank/partial memakai tanggal log, bukan tanggal edit.
- Umur odometer lintas BBM, servis, dan KM manual; confidence tidak diklaim saat data stale/terbatas.
- Guard lonjakan KM dan pengingat KM 7 hari.
- Penghapusan/edit BBM merekonsiliasi fuelState dari full tank atau koreksi manual yang masih valid.

## Akumulasi 2747–2749
1. Kalibrasi adaptif per kendaraan: minimal 3 segmen full-to-full, maksimal 5 segmen, median, outlier IQR, blend 75/25, batas perubahan ±10% per siklus, dan tahan jika deviasi >20%.
2. Kalibrasi hanya memengaruhi prediksi ke depan; tidak mengubah transaksi, KM, fuelState baseline, atau histori lama.
3. Kalibrasi otomatis invalidated jika sumber BBM diedit/dihapus/dipindah; rollback hanya jika ID segmen sumber tetap sama.
4. Kapasitas tangki legacy dan profil disatukan melalui fallback/mirror; konflik >10% dan isi >110% kapasitas ditolak.
5. Retry transaksi BBM idempoten dengan `txId`; konflik jika sudah ada lebih dari satu log tertaut.
6. Guard KM BBM membaca seluruh sumber KM dan mencegah penurunan pada tanggal sama.
7. Import CSV BBM dideduplikasi, divalidasi terhadap kronologi lintas domain, dan di-rollback jika konflik.
8. Koreksi manual hanya mengalahkan full tank jika tanggalnya benar-benar lebih baru; full tank menang pada tanggal yang sama.

## Verifikasi
- Tes fokus fuel/BBM + odometer + import/backup: 573/573 PASS.
- Build minified dan syntax check bundle A/B: PASS.
- Bundle freshness: PASS.
- Window exposure: PASS.
- ESLint file yang disentuh: 0 error; warning unused-vars lama tetap tercatat.
- Full repository test suite dan PWA perangkat nyata belum diverifikasi.

Lihat `AUDIT-RESULT-FUEL-ACCURACY-2749.md` untuk temuan, cakupan, dan batasan audit.
