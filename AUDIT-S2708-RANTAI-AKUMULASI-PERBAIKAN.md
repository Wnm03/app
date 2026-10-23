# AUDIT S2708 — Rantai akumulasi dan rantai perbaikan (S2653 → S2707)

Baseline: `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`. Tanggal: 23 Okt 2026.

## Metode
Tiap lapisan (S2703…S2707) dipasang SENDIRI di salinan baseline bersih, lalu: `refresh-file-hashes.py --check`, `verify-bundle-freshness`, konsistensi versi (konstanta modul / `sw.js` / `?v=`), tes milik lapisan. Antar lapisan dibandingkan hash per file. Isi zip dibandingkan dengan `CHANGED-FILES-*` dan manifest.

## Hasil
| Lapisan | File (berubah+baru) | Hash | Versi | Tes lapisan |
|---------|---------------------|------|-------|-------------|
| S2703 | 20 + 17 | basi=0 | 2657 | 19/19 |
| S2704 | 21 + 23 | basi=0 | 2658 | 24/24 |
| S2705 | 21 + 29 | basi=0 | 2659 | 27/27 |
| S2706 | 21 + 35 | basi=0 | 2660 | 33/33 |
| S2707 | 21 + 39 | basi=0 | 2660 | 37/37 |
Tidak ada file hilang antar lapisan; tidak ada file identik baseline; `CHANGED-FILES` cocok dengan isi zip; CHANGELOG berurutan; S2707 identik byte-per-byte dengan pohon kerja.

## Temuan dan tindak lanjut
| ID | Temuan | Status |
|----|--------|--------|
| R-1 | Tes "tidak parse ulang pada cache hit" di S2704–S2706 kosong (patch `String.prototype` di realm luar `vm`) | Diperbaiki di S2707 (penghitung di dalam konteks, terbukti gagal pada kode lama). Pakai S2707+ |
| R-2 | Ringkasan S2704 salah hitung (22/22; benar 21/23) | Dikoreksi di sini; manifest S2704 sudah benar |
| R-3 | Manifest S2705–S2707 tanpa pemisahan berubah/baru dan tanpa hash | Diseragamkan di S2708 |
| R-4 | `COVERAGE-PER-MODULE.md` basi 1 tes setelah S2707 | Dihasilkan ulang di S2708 |
| R-5 | Nama berkas tidak menyebut S2701 | Disesuaikan di S2708 |
| R-6 | Overlay menimpa tanpa memeriksa baseline tujuan | `scripts/apply-check.js` + `BASELINE-HASHES.json` (S2708) |
| R-7 | Tes replay rantai S2180–S2223 di-SKIP (fixture tidak dibundel) | TERBUKA — butuh fixture kanonik dari pemilik |
| R-8 | Zip asli S2653/S2701/S2702 tidak tersedia | TERBUKA — isi S2702 dalam S2703 hanya cocok dengan manifest S2703 |

## Cara pakai apply-check
1. Ekstrak zip patch ke folder sementara.
2. `node scripts/apply-check.js <folder-aplikasi-anda>` dari folder patch itu. Exit 0 = aman; 1 = ada KONFLIK/HILANG/RUSAK.
3. Jika aman, timpa file seperti biasa, lalu `refresh-file-hashes.py --check`, `npm run verify-bundle`, `npm test`.
