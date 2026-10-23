# S2711 — Reminder Single Source of Truth: downstream identity chain

## Akumulasi
- Melanjutkan ZIP kumulatif S2710; semua entri sebelumnya dipertahankan.
- ZIP ini berisi file perubahan/akumulasi saja, bukan full release.

## Audit temuan dan perbaikan
1. `predictService()` belum mengekspos identitas komponen kanonis ke consumer reminder. Kini hasil prediksi membawa `serviceComponentId` dan `masterCategoryId`.
2. `VehicleReminder.serviceReminders()` kini meneruskan `categoryId`, `serviceComponentId`, dan `masterCategoryId` agar downstream tidak harus menebak identitas dari label.
3. `VehicleNotifBridge` sebelumnya membuat fire key dari nama kategori mentah. Kini memakai ID komponen jika tersedia; fallback nama dinormalisasi (Unicode NFKC, isi kurung dan sufiks merek/spesifikasi dibuang, spasi/case diseragamkan). Deduplikasi berlaku dalam satu pemanggilan dan antar-pemanggilan lewat fired keys, dengan scope kendaraan.
4. `VehicleRecommendationEngine` menggunakan identitas stabil yang sama dan mendeduplikasi alias serta nama tak dikenal yang sama pada kendaraan yang sama.
5. Tes regresi baru memverifikasi alias dikenali, nama tak dikenal identik, dan isolasi antar-kendaraan.

## Verifikasi
- Build `node scripts/build.js --require-minify`: lulus; bundle A/B berhasil dibuat ulang.
- `node scripts/verify-bundle-freshness.js`: lulus untuk kedua bundle.
- Tes fokus S2692/S2710/S2056–S2059/S2070/S2711: 20/20 lulus.
- `node scripts/service-sot-integrity-gate.js`: berjalan tetapi melewati batas waktu sesi; hasilnya tidak diklaim lulus.
- Belum menjalankan aplikasi Chromium dengan backup asli. Notifikasi dan dashboard belum diverifikasi terhadap backup asli pengguna.

## Prinsip 1 SOT
Prediksi servis tetap berasal dari `predictService()`/urgency engine. Dashboard, daftar prediksi, rekomendasi, dan push hanya mengonsumsi identitas/status itu; tidak menambah rumus interval atau menulis ulang riwayat. Deduplikasi tidak menggabungkan dua kendaraan.
