# Tambahan audit di atas S2433.2 build 2329 (TANPA perubahan source/bundle)
Basis: PATCH-S2433-2-KUMULATIF-KOMPATIBILITAS-KOMPONEN.zip (SHA-256 9ad21368dcc01bb2deac01d9756f39027b0d40f9eec8781d47165be1e0e495d1). Seluruh file kode, data, dan bundle identik dengan basis; hanya menambah:
- tests/vehicle-type-jenis-characterization-s2433-3.test.js — 8 tes KARAKTERISASI perilaku aktual jenis vs vehicleType (kasus A–E, celah audit SOT, round-trip applyRestoredData, konsumen jenis-saja). Mengunci perilaku saat ini, BUKAN menyatakan benar; sengaja gagal bila kebijakan konflik kelak diubah.
- scripts/audit-populasi-jenis-vehicletype.js — skrip read-only untuk backup JSON nyata (node scripts/audit-populasi-jenis-vehicletype.js backup.json). Tidak menulis apa pun.
Status: HOLD promosi produksi. S2433.3 (deteksi/pelaporan konflik tanpa mutasi) belum ditulis; kebijakan pemenang jenis/vehicleType belum diputuskan.
Belum terbukti: audit populasi data nyata, impor backup lewat UI/file nyata, rantai form edit utuh.

## Tambahan S2433.3 — kontrak deteksi konflik (non-mutatif)
- `docs/KONTRAK-S2433-3-DETEKSI-KONFLIK.md`: draf kontrak untuk disetujui. `scripts/lib-deteksi-konflik-jenis-vehicletype.js`: fungsi murni (tidak dimuat aplikasi/bundle). `tests/vehicle-type-jenis-conflict-contract-s2433-3.test.js`: 9 tes kontrak.
- Source & bundle tetap identik dengan ZIP beku `9ad21368…` (HOLD berlaku). Kebijakan PENYELESAIAN konflik belum diputuskan.

## Klasifikasi tes #2979 (payroll-absensi-minggu-template-sabs1: "alur lama utuh…")
- Gagal juga pada basis beku saja, deterministik. Penyebab: tes bergantung pada tanggal sistem asli. `Payroll.cancelEditWorkDay()` mengisi ulang `whDate` dengan hari ini (new Date()) sehingga entri tersimpan di tanggal hari ini, bukan 2026-10-12 yang di-hardcode tes. Hanya lulus pada 2026-10-12. Bukan cacat source; perbaikan = tes harus mengatur ulang `whDate`/jam. Tidak diperbaiki di patch ini.

## S2433.3 FINAL r1 (2026-10-13) — keputusan kontrak & hasil audit data nyata
Kontrak final: DETEKSI & PERINGATAN SAJA (lihat docs/KONTRAK-S2433-3-DETEKSI-KONFLIK.md, bagian "Keputusan final"). Tanpa rekonsiliasi otomatis.

Hasil audit (backup keluarga W, 2026-10-10; file backup TIDAK disertakan; hash sebelum = sesudah `ba45de0a51e7d286f0e95d400a3a5b688a441bdec5381eb8ed59daf1986072fe`, read-only):
- 4 kendaraan diperiksa. Konflik jenis vs vehicleType: 0. Lintas-konsep listrik: 0. Nilai tidak valid: 0. Snapshot SOT beda: 0.
- Profil model `vario-125` dan `beat-fi` (keyakinan explicit, registri bundle) cocok dengan tipe tersimpan (motor). `profil_model_beda_dari_tersimpan` = 0.
- 3 temuan `data_tidak_lengkap` = kendaraan lama hanya ber-`jenis`; bukan konflik, tidak diubah.
- KETERBATASAN: satu backup, 4 kendaraan. Nol konflik tidak membuktikan konflik mustahil. Kasus karakterisasi (edit jenis pada kendaraan bermodel) belum pernah terjadi di data ini.

Status gerbang (apa adanya):
- Basis beku `9ad21368dcc01bb2deac01d9756f39027b0d40f9eec8781d47165be1e0e495d1`: 0 file basis berubah; source, bundle (build 2329), data & tes lama TIDAK diubah.
- Full test: 8853 tes, 8851 lulus, 1 GAGAL, 1 skip. Yang gagal: #2979 (shard: #169) "alur lama utuh: isi jam manual setelah template…" = kegagalan payroll terpisah, sudah ada di basis beku (penyebab: cancelEditWorkDay() mengisi whDate dengan tanggal hari ini). BUKAN lulus.
- service-sot-integrity-gate: 9 pemeriksaan PASS; `FULL REGRESSION` GAGAL karena tes #2979 yang sama. Gerbang ini tidak hijau selama #2979 belum ditangani.
- verify-bundle, audit:sot, audit:architecture, audit:patch-integrity, verify-window-expose: PASS. audit:test-hygiene: 59 asersi lama (advisory), tes S2433.3 tidak termasuk.
- Penutupan audit ini TIDAK mengizinkan promosi produksi. HOLD tetap sampai gerbang rilis ditinjau (termasuk #2979).

## r2 (2026-10-13) — perbaikan determinisme tes #2979 (TERPISAH dari S2433.3)
Riwayat di atas (r1) dipertahankan apa adanya; bagian ini hanya menambah.
- Perubahan: SATU file, `tests/payroll-absensi-minggu-template-sabs1.test.js`, tes "alur lama utuh: isi jam manual setelah template…". `P.cancelEditWorkDay()` -> `P.cancelEditWorkDay('2026-10-12')` (2 tempat; parameter `dateOverride` sudah ada di kode produksi). Hanya tes berubah. Source, bundle, kode kendaraan, dan kontrak S2433.3 (FINAL) TIDAK berubah.
- Akar masalah: `cancelEditWorkDay()` tanpa argumen mengisi `whDate` dengan hari ini (jam sistem asli); tes hanya lulus pada 2026-10-12.
- Bukti determinisme: dengan `Date` palsu disuntik ke konteks vm, tes lama LULUS hanya pada 2026-10-12 (gagal pada 2026-10-13 dan 2027-03-01); tes baru LULUS pada 2026-10-12, 2026-10-13, 2026-10-19, 2026-12-31, 2027-03-01 serta pada jam sistem asli.
- Hasil aktual (dijalankan ulang, bukan diwarisi): full suite 8853 tes, 8852 lulus, 0 gagal, 1 skip. service-sot-integrity-gate: 9 pemeriksaan + FULL REGRESSION semuanya PASS. verify-bundle, audit:sot, audit:architecture, audit:patch-integrity, verify-window-expose: PASS. audit:test-hygiene: 59 asersi lama (advisory), tidak berubah.
- Catatan: pada r1 #2979 tercatat GAGAL; status itu benar untuk r1 dan tidak diubah. Mulai r2, tes tersebut lulus.
- HOLD produksi tetap berlaku sampai ditinjau pemilik.

## r3 (2026-10-13) — audit ketergantungan tanggal pada tes (TANPA perubahan tes/source)
Riwayat r1/r2 dipertahankan. r3 hanya MENAMBAH: `docs/AUDIT-KETERGANTUNGAN-TANGGAL-TES.md`, `scripts/uji-geser-jam-preload.js`, `scripts/audit-ketergantungan-tanggal-tes.sh`.
- Temuan: selain #2979 (sudah diperbaiki di r2), ada 4 tes (pada 31 Des) / 10 tes (pada 1 Mar 2027) yang bergantung jam sistem; semuanya JUGA ada di baseline app-main_15 murni, bukan akibat rantai S2433. Detail & rekomendasi: lihat dokumen audit.
- Status gerbang pada tanggal hari ini (2026-10-13): full suite 8853 tes, 0 gagal (tidak berubah dari r2). Perilaku pada tanggal lain adalah temuan di atas.
- HOLD produksi tetap berlaku.
