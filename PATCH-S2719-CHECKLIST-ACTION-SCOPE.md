# S2719 — Checklist action must remain component-scoped

## Temuan yang direproduksi
Dua projection masih memakai fallback truthy `component.actionType || log.actionType`: `ServiceHistoryMultiChecklistS2019.componentsOf()/reminderProjection()` dan `ServiceHistoryReminderComponentS2026.projection()`. Jika aksi sesi utama bernilai `ganti` sedangkan checklist komponen secara eksplisit menyimpan string kosong, projection dapat mewariskan `ganti` ke komponen tersebut. Ini bertentangan dengan guard baseline S2717/S2718 dan dapat membuat tampilan/pemeriksaan reminder menganggap komponen sudah diganti tanpa bukti aksi pada komponennya.

## Perbaikan
- Checklist yang memiliki properti `actionType` menjadi otoritatif, termasuk nilai kosong/null yang berarti tidak diketahui.
- Aksi sesi hanya menjadi fallback jika properti aksi memang tidak ada pada objek komponen.
- Projection bersifat read-only; objek riwayat asli tidak dimutasi.
- Bundle dan cache PWA dibangun ulang pada versi 2681.

## Verifikasi
- 17/17 tes terfokus lulus, termasuk dua tes baru S2719 dan regresi S2040/S2716–S2718.
- `node scripts/verify-bundle-freshness.js`: lulus untuk kedua bundle.
- `node scripts/build.js --require-minify`: selesai; kedua bundle lolos `node --check`.

## Batasan
Belum menjalankan keseluruhan `tests/*.test.js` atau browser/WebView E2E. Build tetap memperingatkan `docs/AUDIT_MATRIX.md` bahwa inventaris baseline tertinggal; peringatan ini bukan kegagalan build.
