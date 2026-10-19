# PATCH S2596 — Akumulasi Car Notes Null KM + Copy Hasil Tes Otomatis

Baseline: `app-main (29).zip` (build 2593)
Build hasil: `s2033-reset-interval-chain-audit-2594`

## Temuan audit
1. Render BBM/Car Notes masih memiliki jalur yang menerima `km: null`; guard diperbaiki agar nilai kosong tidak memanggil `toLocaleString()` dan angka 0 tetap valid.
2. Tiga tombol salin hasil diagnostik (`copySelfTestResults`, `copyNavSmokeResults`, `copyModalSweepResults`) langsung gagal jika `navigator.clipboard.writeText()` tersedia tetapi ditolak browser. Fallback lama juga tidak memeriksa hasil `document.execCommand('copy')`, sehingga bisa memberi status sukses palsu.

## Perbaikan
- Satu helper `copyDiagnosticText()` dipakai ketiga tombol salin.
- Jika Clipboard API ditolak, otomatis mencoba textarea + `execCommand('copy')`.
- Status sukses hanya diberikan jika salah satu metode benar-benar melaporkan berhasil; jika tidak, toast menjelaskan fallback manual.
- Source `tests/self-test.js` disinkronkan dengan `self-test.js`.
- Bundle produksi A/B, HTML, service worker, konstanta versi dan metadata build diregenerasi/sinkron ke versi 2594.
- Mempertahankan perbaikan null KM S2595 dalam akumulasi ini.

## Validasi
- Tes terarah S2595 + S2596: **7 lulus, 0 gagal**.
- `node --check self-test.js`: lulus.
- `node --check tests/self-test.js`: lulus.
- `node scripts/build.js`: berhasil; kedua bundle lolos pemeriksaan sintaks, `index.html` dan `app_production.html` sinkron, cache PWA versi 2594.
- `npm test`: berjalan hingga sekitar tes ke-3113 lalu proses dihentikan oleh batas waktu eksekusi tool. Ini **bukan** hasil full suite selesai dan tidak boleh dianggap sebagai full-suite pass.

## Penerapan
Unggah semua file di ZIP ke lokasi relatif yang sama di repository. Jangan hanya mengunggah HTML atau service worker; bundle, source diagnostik, source Car Notes, dan tes regresi juga termasuk patch ini.
