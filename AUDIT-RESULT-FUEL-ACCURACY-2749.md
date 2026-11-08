# Audit Fuel Accuracy — Cumulative Patch 2749

## Baseline dan cakupan
- Baseline: `app-main (3).zip`.
- Patch kumulatif: seluruh perubahan 2741–2746 dipertahankan, ditambah tahap 2747–2749.
- Paket akhir hanya berisi file yang berubah terhadap baseline; bukan full release dan tidak menyertakan backup/data pribadi.

## Temuan tambahan yang dikonfirmasi
1. **Kapasitas tangki memiliki dua representasi**: field legacy `vehicle.fuelTankCapacityLiter` dan profil `vehicle.fuelTankProfile.tankCapacityLiter`. Beberapa jalur hanya membaca salah satunya sehingga guard/estimator dapat memakai kapasitas berbeda.
2. **Retry transaksi dapat membuat log BBM ganda** bila log sudah tercatat tetapi `bbmLinkId` transaksi belum sempat tersimpan.
3. **Import Car Notes CSV tidak menerapkan guard kronologi BBM** dan tidak memiliki fingerprint deduplikasi BBM yang setara dengan JSON import.
4. **Validasi BBM hanya membandingkan tanggal yang lebih awal/lebih akhir**, sehingga pembacaan KM yang lebih rendah pada tanggal yang sama dapat lolos pada jalur langsung.
5. **Rekonsiliasi baseline dapat mempertahankan koreksi manual lama walau ada full tank yang lebih baru**. Tanggal sumber harus menentukan prioritas, bukan hanya jenis sumber.
6. **Kalibrasi adaptif perlu menolak data kotor, mengeluarkan outlier, dan dapat dibatalkan hanya jika sampel sumber tidak berubah.**

## Implementasi
### 1. Kalibrasi adaptif per kendaraan
- Aktif setelah tersedia minimal 3 segmen full-to-full valid; memakai maksimal 5 segmen terbaru.
- Mengeluarkan outlier dengan pagar IQR/Tukey sebelum menghitung median.
- Menggunakan median segmen, blend 75% parameter lama + 25% median baru, dan membatasi perubahan maksimal ±10% per siklus.
- Jika median berbeda lebih dari 20% dari parameter aktif/historis, kalibrasi ditahan dan metadata review dibuat.
- Kalibrasi ditahan bila ada log invalid, duplicate ID/content, odometer backstep, over-capacity fill, atau konflik kapasitas.
- Parameter disimpan per kendaraan dan dipakai hanya oleh `FuelStateEstimator`; `fuelEfficiency()` dan seluruh histori transaksi tetap tidak berubah.
- Proses idempoten berdasarkan ID full-tank pemicu. Edit/hapus/perubahan sumber membatalkan override aktif.
- Rollback hanya mengaktifkan kembali parameter lama jika ID segmen sumber masih identik.

### 2. Satu kapasitas tangki yang konsisten
- `FuelTankProfile.get()` memakai profil khusus sebagai prioritas dan fallback ke field legacy untuk kendaraan lama.
- `FuelTankProfile.save()` menyinkronkan field legacy saat kapasitas diubah/dikosongkan.
- Estimator dan full-tank sync menggunakan kapasitas yang sama.
- Konflik lebih dari 10% antara profil dan field legacy menolak pencatatan BBM sampai disamakan.
- Input pengisian di atas 110% kapasitas ditolak; toleransi 10% menjaga variasi pembacaan nozzle.

### 3. Integritas transaksi dan impor
- `recordBbmLog()` memakai `txId` sebagai kunci idempotensi. Retry menggunakan log tertaut yang sudah ada; lebih dari satu log tertaut menghasilkan konflik eksplisit, bukan memilih diam-diam.
- Validasi odometer BBM kini membaca log KM manual, BBM, dan servis; pada tanggal yang sama KM tidak boleh turun.
- CSV BBM memiliki fingerprint deduplikasi dan validasi kronologi sebelum commit.
- Jika validasi CSV gagal, batch BBM/servis dan snapshot fuel state/history dikembalikan.
- Setelah import berhasil, fuelState kendaraan terdampak direkonsiliasi dari sumber yang masih valid.

### 4. Rekonsiliasi urutan sumber
- Full tank pada tanggal sama tetap menang atas koreksi manual.
- Koreksi manual hanya menang jika tanggalnya lebih baru dari full tank yang tersisa.
- Full tank yang lebih baru memulihkan baseline walau state saat ini berasal dari koreksi manual lama.

## Verifikasi
- Tes fokus fuel/BBM, odometer, import/backup: **573/573 PASS**.
- Tes JSON import lama dan CSV import: lulus, termasuk pengulangan import dan rollback pada konflik odometer.
- ESLint pada file yang disentuh: **0 error**; warning `no-unused-vars` lama/dispatcher tetap ada.
- Build minified: PASS.
- `node --check` kedua bundle: PASS.
- `verify-bundle`: PASS, hash source cocok.
- `verify-window-expose`: PASS.
- Full `npm test` seluruh repository belum dijalankan sampai selesai pada tahap ini; tidak diklaim lulus.

## Batasan yang masih terbuka
- Pengujian CSV dilakukan melalui FileReader harness, belum melalui PWA Android nyata.
- PWA/offline/cache update belum diuji di perangkat fisik.
- Kalibrasi adaptif baru belajar saat full-tank baru tersimpan; tidak melakukan migrasi/kalibrasi massal saat aplikasi startup.
- Timestamp event belum tersedia untuk seluruh sumber KM. Untuk tanggal sama, kebijakan konservatif memakai KM tertinggi yang sudah tercatat sebagai batas bawah dan urutan baris import harus non-menurun.
- Belum ada validasi lapangan dengan backup asli terbaru di tahap ini; simulasi dan fixture deterministik bukan bukti akurasi kendaraan nyata.
