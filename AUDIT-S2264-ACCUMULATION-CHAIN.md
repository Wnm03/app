# S2264 — Audit rantai akumulasi S2262 → S2263 → S2264

## Baseline dan cakupan
- Baseline: `app-main (50).zip`.
- Rantai patch: S2262 (self-test bootstrap error) + S2263 (render purity / nested tabs / integrity card) + S2264 (tab-scoped fuel repair dan penghapusan pemanggilan audit duplikat).
- Paket hanya memuat file yang berbeda dari baseline dan dokumen audit/manifest; bukan full release.

## Rekomendasi tambahan yang diterapkan pada S2264
1. `healFuelStateReferenceKm()` sekarang hanya dipanggil saat tab BBM aktif, bukan pada setiap pergantian tab Car Notes. Ini mencegah repair domain BBM berjalan ketika pengguna membuka Servis/Insight/Pajak/Jalan.
2. Menghapus pemanggilan kedua `CarNotesPerformance.auditCurrent()` dari jalur `renderCnTab()` untuk Servis. `renderServiceIntegrityCard()` sudah mengambil hasil audit; pemanggilan kedua tidak diperlukan.
3. Menambahkan tes regresi untuk kedua kontrak tersebut.

## Hasil validasi yang benar-benar dijalankan
- Tes S2262 + S2263 + S2264: **5/5 PASS**.
- `node --check` untuk `modules/shared/modules-render-b.js`, `modules/vehicle/servis-b.js`, `modules/vehicle/sparepart-servis.js`: **PASS**.
- `node scripts/verify-carnotes-performance.js`: **PASS** (4 core files checked).
- `node scripts/verify-carnotes-integrity.js`: **PASS**, scanned=517, forbidden=0, duplicateIds=0/0, ServisDeclarations=1.
- `node scripts/verify-source-size.js --strict`: **FAIL**. `modules/vehicle/servis.js` masih 1.933 baris (target arsitektur <1.600), `build.js` 1.619 baris (warning), dan `modules/shared/features-helpers-global-security.js` 1.612 baris melewati batas 1.600. File helper terakhir sudah 1.611 baris pada baseline, jadi bukan regresi yang diperkenalkan rantai ini; S2262 menambah satu baris net.
- `node scripts/service-advanced-integrity-gate.js`: **FAIL** pada gate S1918 source budget karena `servis.js` 1.932/1.933 baris, di atas batas 1.900. Threshold tidak diubah untuk memalsukan kelulusan.
- `npm test`: dijalankan tetapi tidak selesai dalam batas waktu lingkungan (berhenti sekitar test 2.489 tanpa ringkasan final). Ini **bukan** hasil PASS dan bukan bukti ada kegagalan test tertentu.
- Build produksi: belum dijalankan karena `node_modules`/`esbuild` tidak tersedia. Bundle production untuk perubahan S2263/S2264 belum fresh dan runtime browser belum diverifikasi.

## Audit rantai akumulasi
- S2262 files tetap dipertahankan dalam paket kumulatif.
- S2263 source changes tetap dipertahankan; tidak ada penggantian SOT atau pembuatan engine integrity baru.
- S2264 hanya mengubah perilaku render pada `modules/shared/modules-render-b.js` dan memperluas tes regresi.
- File bundle yang disertakan hanya membawa perubahan bundle S2262 yang sudah ada. Bundle belum memuat perubahan source S2263/S2264 karena build minified belum berhasil. Jangan deploy ZIP ini sebagai build production final sebelum menjalankan build.

## Rekomendasi lanjutan yang belum aman ditutup otomatis
1. Pecah `modules/vehicle/servis.js` ke modul core/history/reminder/modal/session/actions dengan kontrak API dan urutan build eksplisit. Jangan memindahkan blok secara mekanis tanpa tes integrasi.
2. Pecah `modules/shared/features-helpers-global-security.js` untuk menutup source-size gate lama tanpa mengubah threshold.
3. Turunkan Bundle B dari ~4.9 MB ke <4 MB lewat lazy-loading tingkat modul dan pengukuran dependensi; jangan sekadar menghapus kode yang belum jelas pemakainya.
4. Setelah build tersedia, jalankan seluruh tes, `npm run audit:carnotes-advanced`, `npm run audit:carnotes-performance`, `npm run audit:patch-integrity`, `npm run verify-bundle`, dan tes runtime browser pada perangkat Android.
