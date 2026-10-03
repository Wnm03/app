# Rantai kumulatif S2369–S2388 — optimasi dan audit integritas

## Ringkasan sesi awal
- **S2369:** satu lookup log servis bersama untuk filter kategori/komponen laporan keuangan.
- **S2370:** satu indeks Map untuk resolusi ID riwayat pada operasi bulk.
- **S2371:** menyelesaikan sumber sesi edit satu kali sebelum filter.
- **S2372:** satu snapshot baris sesi dan pemetaan idempotensi berbasis indeks.
- **S2373:** Set lokal untuk pemeriksaan idempotensi checklist.
- **S2374:** pemindaian ekor log yang baru ditambahkan untuk linking sesi.
- **S2375:** satu indeks ID untuk paket audit riwayat.
- **S2376:** indeks lokal baris servis dan transaksi saat rollback penghapusan sesi.
- **S2377:** indeks first-match untuk snapshot stok saat hapus sesi.
- **S2378:** indeks first-match snapshot stok untuk rollback batch.
- **S2379:** pengumpulan ID dan filter log rollback batch dalam satu lintasan.
- **S2380:** cache lookup kendaraan pada proyeksi keuangan batch.


## S2381 — Cache kategori pada preflight servis batch

`Servis.markServicedBatch(items)` kini menggunakan `Map` lokal untuk resolusi `catId` pada pengumpulan snapshot stok rollback. Kategori yang sama tidak memicu pemindaian katalog berulang; pencocokan tetap strict (`===`), hasil pertama tetap dipakai, dan hasil tidak ditemukan juga di-cache. Jalur pencarian stok tidak diubah. Pengujian: `tests/s2381-batch-category-lookup-cache.test.js`.

## S2382 — Cache kandidat stok otomatis pada preflight batch

`Servis.markServicedBatch(items)` sekarang meng-cache hasil kandidat stok berdasarkan ID kategori selama preflight batch. Ini menghindari pemindaian `D.partsStock` berulang untuk kategori yang sama dan juga meng-cache hasil `null`. `_findAutoGantiStock()` tetap menentukan kecocokan kendaraan dan aturan tepat-satu-kandidat; cache bersifat lokal satu batch sebelum mutasi stok.

- Audit: `AUDIT-S2382-BATCH-STOCK-CANDIDATE-CACHE.md`
- Test baru: `tests/s2382-batch-stock-candidate-cache.test.js`
- Test S2381 disesuaikan agar memverifikasi cache kategori dan cache kandidat stok baru secara bersamaan.
- Build: versi `2235`; bundle valid secara sintaksis, belum diminifikasi karena `esbuild` tidak tersedia.
- Full-suite/release gate belum dikonfirmasi lulus.
- `DELETE-FILES.txt` tetap mencatat `pro-ui-layer.css`.


## S2383 — Single-pass pencocokan stok servis

`findMatchingStockByCatalogId()` dan `findMatchingStockByName()` kini memindai daftar stok satu kali sambil menghitung kandidat dalam cakupan dan mengingat kandidat kendaraan yang cocok tepat. Kebijakan satu-kandidat, prioritas kandidat kendaraan tepat saat ambigu, hasil `null`, dan urutan kandidat dipertahankan.

- Audit: `AUDIT-S2383-STOCK-MATCH-SINGLE-PASS.md`
- Test: `tests/s2383-stock-match-single-pass.test.js`
- Validasi terfokus kumulatif S2369–S2383: 32 test lulus, 0 gagal. Build: versi 2236; bundle lolos pemeriksaan sintaks tetapi tidak diminifikasi karena esbuild tidak tersedia. Full-suite/release gate belum dikonfirmasi.

## S2384 — satu lookup sumber riwayat servis pada preflight edit

Preflight edit servis kini menyelesaikan baris `Servis.editId` satu kali dan menggunakan kembali referensi tersebut untuk perbandingan odometer/tanggal, identitas sesi checklist, serta fallback kategori legacy. Perbandingan ID strict, pemilihan baris pertama yang valid, dan guard `editId` sebelumnya dipertahankan. Tidak ada cache lintas operasi.

- Audit: `AUDIT-S2384-SERVICE-EDIT-SOURCE-LOOKUP.md`
- Test: `tests/s2384-service-edit-source-single-lookup.test.js`
- Full-suite/release gate belum dikonfirmasi lulus.
- `DELETE-FILES.txt` tetap mencatat `pro-ui-layer.css`.

## S2385 — Snapshot stok hanya untuk tindakan penggantian

Snapshot stok otomatis kini hanya disiapkan ketika `actionType === 'ganti'`. Tindakan `periksa` dan `bersih` tidak memotong stok, sehingga preflight single dan batch tidak lagi menjalankan resolver kandidat stok atau menyimpan kuantitas rollback yang tidak akan dipakai. Jalur `ganti`, aturan pemilihan kandidat, dan rollback stoknya tetap sama.

- Audit: `AUDIT-S2385-STOCK-SNAPSHOT-ONLY-ON-REPLACEMENT.md`
- Test: `tests/s2385-stock-snapshot-only-for-replacement.test.js`
- Full-suite/release gate belum dikonfirmasi; build perlu tetap lolos pemeriksaan bundle.
- `DELETE-FILES.txt` tetap mencatat `pro-ui-layer.css`.

## S2386 — Reuse snapshot riwayat sesi servis

Alur penghapusan komponen/kategori riwayat kini memakai `ctx.originalRows` yang sudah dibaca oleh `_historySessionContext`, sehingga tidak memfilter seluruh `D.servisLogs` untuk sesi yang sama sekali lagi saat membuat daftar komponen. Resolver tetap mendukung pemanggilan lama satu argumen dan tidak memakai cache global.

- Audit: `AUDIT-S2386-HISTORY-SESSION-SNAPSHOT-REUSE.md`
- Test: `tests/s2386-history-session-snapshot-reuse.test.js`
- Test terfokus kumulatif S2369–S2386: 42 lulus, 0 gagal.
- Build: versi 2239; kedua bundle lolos pemeriksaan sintaks. Minifikasi tidak dilakukan karena `esbuild` tidak tersedia.
- Full-suite/release gate belum dikonfirmasi lulus.
- `DELETE-FILES.txt` tetap mencatat `pro-ui-layer.css`.

## S2387 — Reuse vehicle-scoped rows in history rendering

`Servis.renderEditHistoryTab()` now creates one local `vehicleLogs` view and reuses it for session options, component options, and displayed history instead of independently filtering the full global service log for each section. The optional session filter, canonical component resolution, sorting, and read-only source semantics are preserved. Regression tests: `tests/s2387-history-render-vehicle-snapshot.test.js`.

- Build/cache version is updated by the build script.
- Focused cumulative tests and bundle freshness/integrity checks are required; this does not assert that the full suite/release gate passed.
- `DELETE-FILES.txt` continues to preserve the `pro-ui-layer.css` deletion.

## S2388 — Audit rantai kumulatif

Audit menemukan manifest sebelumnya hanya memuat S2381–S2387. Manifest telah dipulihkan menjadi urutan lengkap S2369–S2388; test baru memeriksa 19 sesi, keberadaan audit/test, dan `DELETE-FILES.txt`. Test terfokus S2369–S2387: 47 lulus. Full suite belum dikonfirmasi: eksekusi `node --test tests/*.test.js` melewati 1.700 test namun timeout pada 200 detik. Jangan anggap sebagai release gate lulus.
