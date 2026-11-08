# Audit Ulang Fuel Accuracy — Build 2744

## Scope
Baseline `app-main (3).zip` + seluruh isi `FUEL-ACCURACY-PATCH-2741.zip`, kemudian akumulasi guard odometer, reminder KM, tes regresi, dan desain kalibrasi.

## Temuan/perbaikan

### 1. Jalur BBM khusus Car Notes
`BBM._saveInner()` kini asynchronous dan memakai `withSaveGuardAsync`. Setelah validasi tanggal/neighbor BBM dan sebelum `recordBbmLog()`, guard bersama memeriksa catatan odometer lintas domain. Lonjakan >500 km meminta konfirmasi. Menolak konfirmasi menghentikan simpan sebelum log/transaksi dibuat.

### 2. Jalur BBM dari transaksi keuangan
`applyTxBbmFromTx()` menjadi async dan dipanggil dengan `await` dari `_saveTxInner()`. Jika konfirmasi ditolak, ia mengembalikan `false`; pemanggil melempar token pembatalan sehingga jalur rollback transaksi yang sudah ada mengembalikan mutasi lintas-domain. Ini menghindari transaksi keuangan tersimpan tanpa catatan BBM yang diminta untuk disinkronkan.

### 3. Jalur riwayat servis
`Servis._saveInner()` menjalankan guard sebelum mutasi. Validasi urutan servis tetap aktif. Pemeriksaan lama yang selalu menolak KM servis di atas `getVehicleKm()` dihapus karena entri servis yang lebih baru dapat menjadi sumber odometer terbaru; lonjakan besar kini dikonfirmasi, sedangkan pembacaan kronologis lintas-domain tetap dijaga oleh guard.

### 4. SOT kronologi odometer
Guard bersama membaca `D.kmLogs`, `D.bbmLogs`, dan `D.servisLogs`, dibatasi `vehicleId`, tanggal, dan ID yang sedang diedit. Entri backdate tidak boleh lebih rendah dari catatan sebelumnya atau lebih tinggi dari catatan sesudahnya. Tidak ada perbandingan lintas kendaraan.

### 5. Pengingat KM berkala
`getProactiveReminders()` menambahkan satu reminder per kendaraan ketika catatan odometer terbaru berumur ≥7 hari. Reminder tetap muncul sampai data KM diperbarui. Tidak ada `setInterval`, timer, atau write ke storage pada render.

## Hasil tes

- Tes fokus baru guard/reminder/transaction cancel: 7/7 PASS.
- Fuel/BBM suite gabungan: 597/597 PASS.
- Service suite: 427/427 PASS, 0 fail (3 skipped tercatat sebagai suite-level skip di output runner).
- Build: berhasil, versi 2744, bundle A/B lolos syntax check.
- ESLint pada file yang disentuh: 0 error; warning unused-vars tetap ada.

## Hal yang belum boleh diklaim

- Belum menjalankan full `npm test` hingga ringkasan akhir.
- Belum menguji impor CSV atau interaksi PWA pada perangkat Android nyata.
- Belum menjalankan simulasi tangki dengan kalibrasi adaptif karena implementasi #3 belum diaktifkan.
- Reminder ini in-app, bukan push notification saat aplikasi tertutup.

## Keputusan desain #3
Spesifikasi ada di `DESIGN-FUEL-ADAPTIVE-CALIBRATION-S2742.md`: kalibrasi per kendaraan, minimal 3 segmen full-to-full valid, median dari maksimal 5 segmen terbaru, blend konservatif 75/25, perubahan dibatasi ±10% per siklus, hold jika deviasi >20%, metadata terpisah, dan tidak pernah menulis ulang log historis.
