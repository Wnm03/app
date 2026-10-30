# PATCH-REPO-HYGIENE-S2720

Patch kebersihan repo KW. Terapkan pada baseline yang sesuai dengan `app-main (45).zip` dengan menyalin file patch ke root repo, lalu tinjau `DELETE-MANIFEST.txt` sebelum menghapus file yang terdaftar.

Perubahan: `.gitignore`, gate pemindaian data pribadi, gate sinkronisasi `docs/`, utilitas sinkronisasi docs, audit handler inline, laporan ukuran bundle, integrasi gate release/CI, sinkronisasi aset docs, dan pemindahan `regression-evidence/SUMMARY.txt` ke `docs/archive/manifest/`.

Tidak ada bundle runtime yang diubah. Tidak ada data backup/keuangan yang disertakan. File duplikat target yang masih direferensikan test/script sengaja tidak dihapus agar tidak mengubah perilaku atau merusak gate.

## Revisi (ULANG-3/4): release gate lulus, fixture sintetis, pengarsipan aman
- `eslint.config.js`: `shopDiscountedPrice` & `getVehicleOdometer` didaftarkan sebagai global opsional (selalu dipakai dengan guard `typeof ... === 'function'` + fallback). Menghilangkan 3 error `no-undef` yang sudah ada di baseline dan memblokir `verify-release-ready.js`. Source runtime/bundle tidak berubah.
- `tests/_synthetic-data-fix.js` + 3 tes (S2731-3, S2732, S2733): memakai `data-fix/*.json` asli bila ada; bila tidak ada, input SINTETIS (tanpa data pribadi) dibuat di tmp lalu skrip migrasi yang sebenarnya dijalankan. 15/15 tes lulus di kedua mode, tanpa skip.
- `archive/root-docs/`: 692 file Markdown/TXT root yang TIDAK dirujuk oleh kode/tes/skrip/workflow/manifest kontrak dipindah (isi tidak diubah). 750 file lain tetap di root. Path lama tercantum di DELETE-MANIFEST.txt (hapus setelah menyalin `archive/`).
Hasil: lint bersih, full test EXIT=0, `verify-release-ready.js` = RELEASE GATE LOLOS.

## Revisi (ULANG-5): koreksi audit handler inline
Laporan sebelumnya menyebut ratusan "handler inline" (mis. `aset-owners.js` 7, `modals.js` 269). Itu FALSE POSITIVE: regex lama ikut menghitung `data-onclick`/`data-onchange`, yaitu mekanisme dispatcher aman-CSP (tanpa `new Function`/eval) yang memang sudah dipakai app.
Hasil pemindaian baru: handler inline SUNGGUHAN (`on*="..."`) di sumber runtime = 0; `data-on*` terdelegasi = 543. Migrasi ke `data-action` TIDAK diperlukan.
- `scripts/inline-handler-scan.js` (pemindai bersama), `scripts/audit-inline-handlers.js` (inventaris benar), `scripts/verify-no-inline-handlers.js` (gate), terdaftar di `verify-release-ready.js` dan CI.
- `tests/no-inline-handlers-s2720.test.js`: menjaga angka 0 dan menguji pemindai membedakan `data-on*` dari inline sungguhan.
- Catatan: `modules/shop/modals.js` (di luar build, kandidat hapus) memang masih berisi `on*="..."`; sengaja tidak dipindai karena tidak dimuat runtime.
