# Audit Rantai Perbaikan dan Akumulasi BBM — S2601–S2603

## Identitas / lineage
- Baseline kerja: `app-main (19).zip` — SHA-256 `130cb8651dc06b1c6d59cb43c892a05b79e2590167ce750cda8793e0d1d06da3`.
- Patch yang ditumpangkan: `PATCH-BBM-KONSUMSI-S2601-S2602-AKUMULASI.zip` — SHA-256 `37d857d13f0bb7a9f00bca5eb26b96d3e5be5f13923dd8bb500619bcf6823c95`.
- Akumulasi ini melanjutkan S2601 (tes perilaku konsumsi), S2602 (SSOT ringkasan konsumsi), lalu S2603 (validasi bersama dan kualitas data). Tidak memakai baseline lebih tua.
- Build akhir saat laporan disusun: `s2041-1-part-sot-hardening-2342` (build script menaikkan versi otomatis).

## Temuan dan implementasi
1. **Konsumsi tidak konsisten antar tampilan** — ditutup dengan `getFuelFullTankSegments()` dan `getFuelConsumptionSummary()`; agregasi memakai total km / total liter, memasukkan pengisian parsial yang punya km valid, dan memilih periode dari tanggal anchor akhir tanpa kehilangan anchor awal historis.
2. **Impor angka sebagai string** — segmen dan audit kualitas menormalisasi nilai numerik sebelum agregasi/validasi.
3. **Biaya pengisian parsial tidak lengkap** — `estimateRpPerKm()` kini menghitung harga rata-rata hanya dari liter yang punya biaya/harga terukur. Konsumsi SSOT tetap memakai seluruh liter segmen. Bila seluruh liter memiliki biaya, jalur `Rp/km` mempertahankan pembagian langsung `totalCost/totalKm` untuk menghindari drift floating-point dari hasil lama.
4. **Validasi beda antara Catatan Mobil dan Transaksi** — `validateFuelLogInput()` dipakai di dua jalur simpan, menolak KM/liter tidak valid, liter > 200 L, dan odometer yang mundur terhadap tetangga bertanggal. Kegagalan tidak boleh membuat linkage transaksi/BBM baru.
5. **Duplikat persis** — tidak diblokir atau dihapus demi kompatibilitas perilaku lama. `getFuelDataQuality()` memberi flag `possible-duplicate` dan jumlah duplikat untuk pemeriksaan lanjutan.
6. **Prediksi/insight** — pemeriksaan source menunjukkan `fuel-prediction-engine.js` menurunkan proyeksi dari `fuelEfficiency()`; `fuel-insight-engine.js` memakai `FuelMaintenanceEngine.fuelEfficiencyHealth()`, yang juga memakai `fuelEfficiency()`. Tidak ditemukan rumus km/L independen baru pada dua engine ini.
7. **Backup/import/restore** — jalur JSON backup menyertakan `bbmLogs`; impor JSON melewati deduplikasi berdasarkan ID/fingerprint; CSV memiliki rollback domain jika validasi import gagal. Pengujian backup/restore regresi terarah tetap lulus. Belum dilakukan uji visual perangkat fisik.

## Batasan / risiko tersisa
- Audit mobile pada sesi ini berbasis kode dan tes otomatis, bukan verifikasi visual pada perangkat nyata/browser emulasi.
- `docs/AUDIT_MATRIX.md` memberi peringatan jumlah file stale setelah build; ini bukan kegagalan build, tetapi perlu disinkronkan pada sesi dokumentasi terpisah.
- Build memperingatkan 3 file >1600 baris (`modules/vehicle/servis.js`, `modules/shared/features-helpers-global-security.js`, `build.js`). Tidak dipecah pada patch ini untuk menghindari pelebaran scope.
- Duplikat masih boleh disimpan dan hanya ditandai; penggabungan otomatis tidak dilakukan.

## Gate
- Build minifikasi wajib: PASS pada versi 2342.
- `verify-bundle-freshness`: PASS.
- `verify-window-expose`: PASS — 83 modul.
- `audit:sot`: PASS — 412 runtime sources.
- `architecture-integrity-gate.js`: PASS.
- `persistence-integrity-gate.js`: PASS.
- `pwa-recovery-integrity-gate.js`: PASS.
- Tes terarah BBM + prediksi + integrasi transaksi + backup/restore: 62/62 PASS.
- Full suite: **PASS — 8.881 tests, 8.880 pass, 0 fail, 0 cancelled, 1 skipped, 0 todo**, 32 shard selesai dalam 109 detik (`TEST_SHARDS=32 TEST_CONCURRENCY=1 TEST_SHARD_TIMEOUT_MS=400000`).
- Lint tiga source + test baru: exit 0, 0 error; 56 warning `no-unused-vars` pada fungsi global yang diekspos/dipakai melalui wiring HTML/runtime, bukan error lint.
- Kesimpulan: tidak ada kegagalan tes dalam suite penuh; tetap ada batas audit mobile visual dan dokumentasi coverage stale seperti dicatat di atas.
