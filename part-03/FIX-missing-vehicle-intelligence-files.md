# FIX — 13 file modules/vehicle/ hilang dari repo app-main

## Temuan
`scripts/build.js` (GROUP_B) mereferensikan 13 file di `modules/vehicle/`
yang dipakai untuk bundling (vehicle-intelligence.js, vehicle-reminder.js,
vehicle-notif-bridge.js, vehicle-insight-presenter.js, vehicle-insight-feed.js,
vehicle-trend-api.js, vehicle-fuel-trend.js, vehicle-service-trend.js,
vehicle-recommendation-engine.js, vehicle-priority-scoring.js,
vehicle-reminder-scheduler.js, vehicle-maintenance-automation.js,
vehicle-tax-document-automation.js) — tapi ke-13 file itu TIDAK ADA di
working tree app-main ini. Build gagal total (ENOENT) sejak langkah lint
pertama, dan 10 test terkait `VehicleIntelligence`/`VehicleReminder`/
`VehicleTrendAPI` gagal (module tidak ke-load).

File-file ini ada & lengkap di rilis FULL (kw_release_v1014) — jadi murni
gap sinkronisasi, bukan konflik versi (dicek: tidak ada nama file yang
sama isinya beda di kedua sisi untuk ke-13 file ini, karena memang tidak
ada versi lain di app-main).

## Fix
Salin ke-13 file apa adanya dari rilis FULL ke `modules/vehicle/` di
app-main. Murni penambahan file yang hilang — tidak ada file lain yang
ditimpa.

## Verifikasi
Full suite: fail berkurang dari 31 → 17 (14 test langsung pass, semuanya
terkait VehicleIntelligence/VehicleReminder/VehicleTrendAPI/fleetSummary).

## Belum selesai (di luar scope, TIDAK diperbaiki di patch ini)
`node scripts/build.js` sekarang lolos lebih jauh tapi masih berhenti di
lint "drift struktural Scanner": `sparepartScannerWithCameraTimeout()`
tidak ditemukan di `modules/vehicle/sparepart-scanner.js`, padahal
`vehicleScannerWithCameraTimeout()` ada di `vehicle-scanner.js` (lihat
docs/architecture/ADR-028.md soal duplikasi sengaja 2 scanner ini). Ini
masalah pre-existing (sudah gagal sebelum sesi ini), tidak berkaitan
dengan bug tombol Bayar/Riwayat yang dilaporkan — sengaja tidak disentuh.
Sisa 17 test gagal lainnya juga pre-existing & di luar scope yang sama.

## File yang berubah
- `modules/vehicle/vehicle-fuel-trend.js` (baru)
- `modules/vehicle/vehicle-insight-feed.js` (baru)
- `modules/vehicle/vehicle-insight-presenter.js` (baru)
- `modules/vehicle/vehicle-intelligence.js` (baru)
- `modules/vehicle/vehicle-maintenance-automation.js` (baru)
- `modules/vehicle/vehicle-notif-bridge.js` (baru)
- `modules/vehicle/vehicle-priority-scoring.js` (baru)
- `modules/vehicle/vehicle-recommendation-engine.js` (baru)
- `modules/vehicle/vehicle-reminder-scheduler.js` (baru)
- `modules/vehicle/vehicle-reminder.js` (baru)
- `modules/vehicle/vehicle-service-trend.js` (baru)
- `modules/vehicle/vehicle-tax-document-automation.js` (baru)
- `modules/vehicle/vehicle-trend-api.js` (baru)
