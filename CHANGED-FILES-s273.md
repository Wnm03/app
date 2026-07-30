# Update s273-fix-vehicle-scanner-camera-hang

Dibandingkan dari `kw_release_v931_s272-fix-edit-cicilan-redirect-to-full-form.zip`,
berikut file yang **berubah** (tidak ada file baru yang ditambahkan — hanya modifikasi).

## Fix utama
- **modules/vehicle/vehicle-scanner.js** — root cause fix: tombol "Scan Barcode"
  (kamera scan produk/vehicle catalog) bisa nyangkut layar hitam permanen tanpa
  toast error kalau `getUserMedia()` (dipanggil lewat ZXing
  `decodeFromConstraints()`/`decodeFromVideoDevice()`) hang selamanya (mis. browser/OS
  diam-diam block izin kamera). Ditambahkan timeout guard 10 detik
  (`vehicleScannerWithCameraTimeout`), pola sama persis dengan yang sudah ada di
  `sparepart-scanner.js`. Setelah timeout, user dapat toast error yang jelas, dan
  overlay/busy-flag/ScannerSession di-teardown otomatis — fitur scan lain jadi tidak
  ikut macet.

## File version-bump otomatis (hasil `node scripts/build.js`)
File-file berikut HANYA berubah string versi build (`s272-...` → `s273-...`,
`?v=931` → `?v=933`, `kw-cache-v931` → `kw-cache-v933`) — tidak ada perubahan logic:
- app-bundle-a.min.js *(hasil bundling ulang — WAJIB diupload karena source berubah)*
- app-bundle-b.min.js *(hasil bundling ulang — WAJIB diupload, berisi fix vehicle-scanner)*
- app_production.html
- index.html
- sw.js
- chat-action-handlers.js
- modules/shared/features-helpers-global-security.js
- modules/shared/modals.js
- modules/shared/modules-calc.js
- modules/shared/modules-render.js
- docs/FILE-MAP.md *(dokumentasi auto-generated, opsional tapi disertakan biar sinkron)*

## Cara update di GitHub
Timpa (overwrite) 12 file di atas persis di path yang sama pada repo — struktur folder
di dalam zip ini sudah sama dengan struktur repo (root, `modules/shared/`,
`modules/vehicle/`, `docs/`). Tidak ada file yang perlu dihapus.

Semua 1889 test (`npm test`) sudah dijalankan ulang dan lolos setelah perubahan ini.
