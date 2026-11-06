# AUDIT FUEL BAR SYNC — S2434

## Ringkasan
Perbaikan menyatukan pembaruan Fuel Bar ke `reconcileFuelStateFromLogs(vehicleId)`. Tidak ada rumus konsumsi baru. Konsumsi tetap dihitung oleh `FuelStateEstimator` dengan `fuelEfficiency()`, sedangkan profil dan konversi bar tetap memakai `FuelTankProfile` dan `FuelGaugeEngine`.

## Temuan dan perbaikan B1–B6

### B1 — Isi penuh backdate
- Rekonsiliasi memilih log full-tank yang paling baru berdasarkan tanggal, KM, lalu urutan log sebagai tie-breaker.
- `referenceKm` diambil dari `log.km`, bukan `getVehicleKm()` saat log dimasukkan.
- Bila odometer sudah lebih tinggi, estimator menghitung konsumsi dari KM log penuh tersebut. Jadi memasukkan catatan full-tank lampau tidak langsung memaksa Fuel Bar menjadi 100% pada KM sekarang.

### B2 — Parsial saat km/L belum tersedia
- Log parsial tidak lagi menggeser `referenceKm` atau menulis hasil estimasi sementara sebagai baseline.
- Saat `estimationLimited`, baseline dibiarkan tetap. Log parsial tetap tersimpan dan dihitung ulang ketika `fuelEfficiency()` sudah menghasilkan km/L.
- Sinkronisasi bersifat opsional/terjaga `try/catch`; kegagalan modul estimasi tidak menggagalkan simpan log BBM.

### B3 — Parsial di KM yang sama
- `FuelStateEstimator._partialFillsSince()` kini menerima `km >= referenceKm` dan mengecualikan ID yang sudah termasuk sebelum baseline melalui `appliedBbmIds`.
- Baseline manual merekam ID log yang sudah ada saat koreksi dilakukan; baseline full-tank merekam log yang berada sebelum/hingga titik acuan.
- Dua log parsial berbeda pada KM sama tetap terhitung masing-masing satu kali. FuelState lama tanpa `appliedBbmIds` tetap kompatibel; sumber auto lama diperlakukan sebagai baseline yang telah membekukan parsial pada KM acuannya.

### B4 — Edit dan hapus
- `recordBbmLog()` memanggil rekonsiliasi pada create/edit; bila edit memindahkan kendaraan, kendaraan lama dan baru sama-sama direkonsiliasi.
- `BBM.del()` merekonsiliasi kendaraan setelah log dihapus.
- `runTxDeleteCascades()` merekonsiliasi kendaraan setelah log terkait transaksi dihapus.
- Rekonsiliasi membangun baseline dari koreksi manual terbaru atau full-tank terbaru yang masih ada. Bila tidak ada baseline valid, `fuelState` otomatis dibersihkan, bukan ditebak.
- Koreksi manual disimpan secara additive di `vehicle.manualFuelCorrection`. Snapshot manual legacy juga dipertahankan ketika baseline full-tank baru mengambil alih, sehingga menghapus full-tank terakhir dapat memulihkan koreksi manual.

### B5 — Impor CSV
- Baris BBM tidak lagi dianggap full-tank secara default.
- Jika CSV memiliki kolom yang jelas bernama `full tank`/`isi penuh`/`tangki penuh`, hanya nilai eksplisit `1/true/yes/ya/full/penuh` yang menandai full-tank.
- Jika tidak ada kolom tersebut, teks sumber harus secara eksplisit memuat frasa seperti `full tank`, `isi penuh`, atau `tangki penuh`; selain itu diimpor sebagai parsial.
- Kendaraan yang terdampak direkonsiliasi setelah seluruh baris diproses. Snapshot rollback impor yang sudah ada tetap dipakai.

### B6 — Dokumentasi invarian
- Header `tx-bbm.js` dan komentar estimator menjelaskan baseline, `appliedBbmIds`, parsial KM sama, dan perilaku `estimationLimited`.

## Keputusan desain
- Tidak menggunakan `>=` sebagai satu-satunya deduplikasi. Pembeda ID `appliedBbmIds` dipakai agar beberapa parsial pada KM yang sama dapat dibedakan.
- Baseline tidak digeser setiap ada parsial. Semua partial sesudah baseline diproyeksikan ulang dari log mentah sehingga edit/hapus tidak meninggalkan nilai fuelState yang sudah terakumulasi dari log yang berubah/hilang.
- Koreksi manual dipertahankan terpisah; rekonsiliasi tidak menghapusnya.
- `syncFuelStateFromEstimator()` dan `syncFuelStateFromFullTankBbm()` tetap tersedia sebagai wrapper kompatibilitas menuju rekonsiliasi tunggal.

## Hasil build
- Perintah: `npm run build` (`node scripts/build.js --require-minify`).
- Hasil: PASS; kedua bundle berhasil diminify dengan esbuild dan `node --check` valid.
- Build ID: `s2433-shop-stock-prevtx-cathint-2743`.
- Versi HTML: `?v=2743`; Service Worker: `kw-cache-v2743`.

## Tes dan gate

| Pemeriksaan | Hasil |
|---|---|
| `node --test tests/fuel*.test.js` | **511 pass, 0 fail** |
| Tes rekonsiliasi + tes sinkronisasi terarah | **17 pass, 0 fail** |
| `verify-bundle-freshness.js` | PASS |
| `verify-window-expose.js` | PASS |
| `sot-integrity-gate.js` | PASS |
| `architecture-integrity-gate.js` | PASS |
| `persistence-integrity-gate.js` | PASS |
| `pwa-recovery-integrity-gate.js` | PASS |

### Full suite
`TEST_SHARDS=64 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=90000 node scripts/run-full-test.js` **belum tuntas** dalam batas waktu eksekusi 300 detik. Pada upaya tersebut 22/64 shard selesai PASS, dua shard menunjukkan kegagalan baseline yang tidak terkait patch, dan 40 shard belum selesai. Kegagalan baseline yang dapat diidentifikasi:
- `tests/delete-manifest-contract-s1780.test.js`: mengharapkan lima path retired sudah tidak ada, tetapi lima path masih ada pada snapshot repo input.
- `tests/s2308-shadow-module-runtime-guard.test.js`: mengharapkan `modules/asset/features-helpers-global-security.js` tidak ada, tetapi file tersebut memang ada pada snapshot repo input.

Karena full suite tidak selesai, status full suite **BELUM TERBUKTI PASS**. Tes domain fuel final (511/511) dan semua gate yang diminta di atas lulus.

## Batasan tersisa
- Estimasi tetap bergantung pada kualitas data odometer dan `fuelEfficiency()`. Jika KM/L tidak tersedia atau fuelState lama tidak memiliki `referenceKm`, estimator sengaja mempertahankan status `estimationLimited`; ia tidak menebak konsumsi.
- Untuk CSV tanpa kolom full-tank khusus, pengenalan full-tank bergantung pada frasa eksplisit di teks baris. Nilai ambigu tetap diperlakukan parsial demi mencegah false full-tank.
- Full test suite belum selesai sebagaimana dijelaskan di atas.
- Browser/PWA runtime manual tidak dijalankan pada tahap ini; build dan pemeriksaan source/gate dijalankan lokal.
