# S256AW — Build uji coba (tidak dikirim) & koreksi test S256AU

## Konteks
Baseline sebelumnya diblokir "bundle B basi + esbuild tidak ada". Sandbox ini punya esbuild **0.28.2** (`/opt/npm-tools`); proyek mengunci **0.24.0** dan `npm install esbuild` ditolak registry (403). Karena itu build dijalankan **hanya di salinan terpisah sebagai uji coba**; bundle hasilnya TIDAK dimasukkan ke paket (versi tidak sama dengan pin proyek → hash tidak akan cocok dengan build resmi).

## Hasil uji coba (`node scripts/build.js --require-minify`, WIB)
- Build selesai tanpa error: versi 2272 → 2273, `node --check` kedua bundle lulus, bundle A 1010 KB / B 2374 KB (jauh di bawah anggaran 5 MB).
- `s2511` (bundle freshness) menjadi hijau.
- Build menulis ulang **12 file**: bundle A/B, `app_production.html`, `index.html`, `sw.js`, lima source berkonstanta versi (`chat-action-handlers.js`, `features-helpers-global-security.js`, `modals.js`, `modules-calc.js`, `modules-render.js`), `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`.
- **34 test lain gagal setelah build.** Semuanya memeriksa TEKS bundle (mis. `inspectAction=schedule.inspectAction||'periksa'`, `_migrationResult`). `build-core.js` memakai `esbuild.transformSync(..., {minify:true})`; minifikasi selalu menormalkan kutip dan menyingkat identifier, jadi regex pada teks mentah tidak akan cocok pada bundle yang benar-benar diminify (tidak spesifik versi). Seluruh bundle di rantai ini (baseline 13 dan sesi-sesi sebelumnya) adalah fallback TANPA minifikasi, sehingga test-test itu belum pernah diuji terhadap bundle minify.

## Koreksi test S256AU (bug nyata, ketahuan dari build uji coba)
Test `s256au` sebelumnya hanya mengecualikan 5 file build dari cek hash; build ternyata mengubah 12 file, 7 di antaranya terdaftar di `FILE-HASHES-SHA256.txt`, sehingga test akan gagal setelah build resmi. Daftar pengecualian kini 12 file. Terbukti: lulus sebelum build, sesudah build, dan sesudah `refresh-file-hashes.py --write`; `--check` setelah build melaporkan tepat 12 basi.

## Yang perlu diputuskan pemilik
Pada build resmi (esbuild 0.24.0, minify penuh) ~34 test pemeriksa-teks-bundle kemungkinan gagal juga. Pilihan: (a) ubah test itu agar memeriksa sumber/ bundle non-minify; (b) bangun bundle test non-minify terpisah untuk suite; (c) konfirmasi bila di mesin Anda test-test itu memang sudah lulus (mis. karena alur build berbeda).
