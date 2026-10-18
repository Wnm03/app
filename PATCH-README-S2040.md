# PATCH S2040 — Audit akar interval servis (kumulatif)

Baseline target: `app-main (22).zip`.

Patch kumulatif membawa perbaikan S2038 dan S2039 serta memperbaiki akar masalah yang ditemukan pada audit lanjutan.

## Akar masalah
1. `buildServiceNextDueSnapshot()` membandingkan tindakan saat ini dengan string `replaceAction` secara langsung. Alias penggantian seperti `pasang` / `overhaul` dapat diperlakukan sebagai tindakan yang tidak mereset snapshot meskipun mesin Pengingat menganggapnya kelompok penggantian.
2. Kebijakan tindakan kadang dibaca dari proyeksi kategori tersimpan, padahal `ServiceInputCatalog` adalah sumber kebijakan komponen kanonis. Nilai lama `cat.gantiResetsInterval` dapat bertentangan dengan master (contoh: master `true`, kategori lama `false`, atau sebaliknya).
3. `getMaintenanceSchedule()` dapat mempertahankan sumbu interval lama yang bertentangan dengan kebijakan `periksa-conditional`: sumbu inspeksi dan penggantian bisa aktif bersamaan, atau interval SOT diletakkan pada sumbu yang salah. Ini membuat Pengingat tetap membaca riwayat yang salah walau snapshot sudah diperbaiki.

## Perbaikan
- Master komponen kanonis menentukan `actionMode`, `resetType`, dan `gantiResetsInterval` bila master menyatakan nilai eksplisit; kategori tersimpan hanya fallback jika kebijakan master tidak tersedia.
- Untuk `periksa-conditional` + `gantiResetsInterval=true`, interval SOT ditempatkan hanya pada sumbu penggantian dan baseline berasal dari riwayat penggantian.
- Untuk `periksa-conditional` + `gantiResetsInterval=false`, interval SOT ditempatkan hanya pada sumbu pemeriksaan dan baseline berasal dari riwayat pemeriksaan; sumbu penggantian lama dibersihkan.
- Snapshot memakai semantik kelompok tindakan yang sama (`ganti`, `pasang`, `overhaul`) dengan penghitungan Pengingat. Pembersihan dan pemeriksaan tidak mereset umur penggantian.
- Snapshot mendukung interval hari selain KM/bulan.
- Build produksi disinkronkan ke versi `2560` (`index.html`, `app_production.html`, bundle A/B, `sw.js`).

## Verifikasi
- 71 tes terarah: **71 lulus, 0 gagal**; termasuk alur session, SOT, interval KM/waktu, action alias, dan dua uji integrasi kebijakan master stale-vs-canonical.
- `npm run verify-bundle`: lulus.
- `npm run verify-window-expose`: lulus.
- ESLint pada file terkait: **0 error**, 34 warning `no-unused-vars` (warning yang sudah ada di file besar, tidak menghalangi build).
- Build `node scripts/build.js --require-minify`: lulus; kedua bundle lolos `node --check`.
- Full test suite dan `npm run service-sot-gate` tidak selesai sebelum batas waktu eksekusi; hasilnya **belum terverifikasi**, bukan dianggap lulus.

## Pemasangan
Overlay **semua file dalam ZIP** pada baseline target dengan struktur folder yang sama, deploy semua berkas bersamaan, lalu lakukan hard reload / bersihkan cache aplikasi agar service worker `kw-cache-v2560` dan bundle baru benar-benar aktif. Jangan hanya mengganti HTML.
