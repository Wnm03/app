# Desain Kalibrasi Adaptif km/L — S2742

## Keputusan desain
Kalibrasi hanya memperbarui **parameter estimator per kendaraan untuk prediksi ke depan**. Riwayat BBM, liter transaksi, KM, `fuelStateHistory`, dan baseline full-tank yang sudah tersimpan tidak pernah ditulis ulang.

## Sumber observasi yang boleh dipakai
1. Hanya segmen full-to-full yang valid: dua pengisian `fullTank=true` berurutan, KM monoton, liter positif, kendaraan sama, tanggal valid.
2. Segmen dengan odometer mundur, duplikasi, jarak nol, liter di luar kapasitas, atau outlier kualitas data dikecualikan.
3. Isi parsial tidak menjadi observasi efisiensi mandiri; ia tetap memengaruhi estimasi level BBM melalui estimator saat ini.
4. Gunakan maksimal 5 segmen full-to-full terbaru; minimal 3 segmen valid sebelum adaptasi otomatis aktif.

## Estimator kalibrasi
- Hitung tiap segmen `segmentKmPerLiter = deltaKm / litersConsumed` dengan rumus konsumsi full-to-full yang sudah ada.
- Gunakan median (bukan mean) sebagai pusat agar satu perjalanan ekstrem tidak menggeser parameter.
- Batasi perubahan parameter maksimal ±10% per siklus kalibrasi terhadap nilai kalibrasi aktif sebelumnya.
- Blend konservatif: `next = current * 0.75 + medianRecent * 0.25`.
- Simpan metadata terpisah: `calibrationVersion`, `valueKmPerLiter`, `sampleCount`, `sampleSegmentIds`, `calibratedAt`, `previousValue`, `method`.
- Jangan pernah menimpa `fuelEfficiency()` sebagai sumber data historis; estimator hanya membaca override kalibrasi bila metadata lolos validasi.

## Guard dan transparansi
- Kalibrasi hanya berjalan setelah full-tank baru tersimpan sukses, idempoten terhadap `bbmLog.id` terakhir yang diproses.
- Jangan kalibrasi jika confidence kualitas segmen rendah, sampel kurang dari 3, kapasitas tangki belum valid, atau jarak tempuh tidak masuk akal.
- Jika median terbaru berbeda >20% dari nilai aktif, tahan otomatisasi dan tampilkan saran tinjau manual; jangan diam-diam mengubah hasil.
- Sediakan rollback metadata ke versi sebelumnya; tidak ada migrasi atau mutasi data BBM historis.
- Data per kendaraan; tidak boleh meminjam efisiensi kendaraan lain atau fleet average.

## Validasi sebelum implementasi
Fixture deterministik minimal: 3 segmen stabil; perubahan gaya riding bertahap; satu outlier; partial fill di tengah segmen; edit/hapus full-tank lama; backdated fill; odometer tidak diperbarui; kapasitas profil berubah; dua kendaraan berbeda. Ukur MAE fuel-liter dan bias bar terhadap simulasi tangki, bandingkan estimator baseline vs adaptif.

## Status
Desain ditetapkan sebagai spesifikasi tahap berikutnya. Belum ada kalibrasi otomatis yang mengubah nilai estimator pada patch ini.
