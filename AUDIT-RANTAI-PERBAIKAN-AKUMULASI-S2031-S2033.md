# Audit Rantai Perbaikan dan Rantai Akumulasi — S2031–S2033

## Ringkasan keputusan
Status: **PATCH KUMULATIF LAYAK DIUJI/DIINTEGRASIKAN, DENGAN CATATAN FINAL-GATE KOMPOSIT BELUM SELESAI**.

### Rantai perbaikan
| Temuan | Bukti/perilaku yang diharapkan | Perbaikan final | Verifikasi |
|---|---|---|---|
| Pemeriksaan tidak boleh menggeser baseline penggantian | S2031: log `periksa` tidak menggantikan baseline `ganti` | Filter tindakan dan jalur interval tetap dipisahkan | PASS |
| `pasang`/`overhaul` adalah alias tindakan reset yang sah bila diminta | Alias harus diakui di jalur reset yang relevan | Normalisasi alias pada matcher dan legacy maintenance | PASS |
| Filter eksplisit `periksa` sebelumnya bisa cocok dengan tindakan lain | Hanya `periksa` yang cocok dengan filter pemeriksaan | Filter eksplisit diperiksa sebelum pengecualian mode | PASS |
| Fallback tanpa filter pada `periksa-conditional` salah memakai keluarga reset penggantian | Baseline pengingat conditional memakai histori `periksa` | Tambah cabang conditional eksplisit di dua matcher | PASS, regresi ditemukan oleh full test dan diperbaiki |
| Versi audit mengunci label build lama | Audit harus valid untuk build baru yang tersinkron | Tes S2423/S2152 dibuat version-agnostic tanpa mengurangi pemeriksaan sinkronisasi | PASS |

## Rantai akumulasi
1. Baseline tetap `app-main (20).zip`.
2. Patch S2031 dibawa sebagai sumber perubahan sebelumnya.
3. Perbaikan S2033 dibawa berikut tes kontrak dan tes regresi.
4. Full-suite menemukan gap fallback no-filter; perbaikannya ditambahkan ke kedua matcher sumber.
5. Build ulang memakai esbuild `--require-minify`, bukan mempertahankan bundle non-minified.
6. `index.html`, `app_production.html`, seluruh konstanta runtime, `sw.js`, dan marker hash bundle disinkronkan pada build `s2033-reset-interval-chain-audit-2553` / cache `kw-cache-v2553`.
7. Bundle A/B dibandingkan byte-for-byte dengan transform esbuild yang dipin; keduanya PASS.
8. Paket final disusun sebagai patch berisi file yang berubah/ditambahkan terhadap baseline; bukan full release ZIP.

## Hasil full test dan gate
- Full test: 8.888 tes, 8.887 lulus, 0 gagal, 1 skip.
- Service SOT gate: PASS.
- Bundle freshness: PASS.
- Window-expose: PASS (83 modul).
- P4.7 final static gate: 25/25 PASS.
- Release hardening: PASS; kedua bundle di bawah budget.
- Release readiness: PASS.
- Lint: 0 error; 1.802 warning.
- Source-size strict: exit 0, 3 file besar tetap di bawah guard cap yang dikonfigurasi.
- Composite `release:final-gate`: tidak selesai dalam jendela eksekusi pada tahap `critical-integrity`; tidak diklaim lulus. Gate independen dan full suite di atas dijalankan terpisah dan lulus.

## Batasan dan keamanan data
- Tidak ada migrasi atau penghapusan histori servis lama.
- Tidak ada backup pengguna yang dimodifikasi.
- Perubahan dibatasi pada matcher reset interval, tes kontrak/regresi, audit build-version yang sebelumnya terlalu spesifik, bundle hasil build, cache/version, dan dokumentasi hasil.
- Jangan mengunggah hanya HTML atau SW: seluruh file dalam ZIP patch harus diterapkan bersama agar source, bundle, dan cache tetap konsisten.


## Addendum S2034 — Baseline interval action semantics

Cleaning and a good-condition inspection must not reset the replacement interval. `buildServiceNextDueSnapshot()` now reuses the latest reset-action history for non-reset actions, while preserving explicit inspection/clean-only schedules. A new S2034 regression test covers cleaning, inspection with condition `baik`, and replacement. Targeted tests: 16/16 PASS; bundle freshness and window-expose gates PASS. Build version synchronized to `s2033-reset-interval-chain-audit-2554` / cache `kw-cache-v2554`.
