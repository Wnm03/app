# S2390 — Perbaikan kontrak tes regresi kumulatif S2369–S2389

Tanggal: 2026-10-03  
Baseline: `app-main (16).zip`  
Ruang lingkup: perbaikan tes/audit yang menjadi usang setelah optimasi S2369–S2388; tidak mengubah runtime source atau bundle.

## Temuan dan perubahan

1. `tests/financial-audit-presenter.test.js` memakai transaksi 1–3 September 2026, di luar jendela audit 30 hari pada tanggal audit 3 Oktober. Fixture dipindah ke 20–22 September agar tes menguji ringkasan dashboard, bukan empty-state yang sah.
2. `scripts/s2287-cross-domain-idempotency-sweep.js` dan `scripts/s2288-cross-domain-retry-recovery.js` masih mencari pola `.find(...)` literal lama. Runtime membangun indeks idempotensi lewat satu traversal log dan `Set`; kontrak tes diselaraskan ke guard fungsi, indeks `Set`, dan penolakan duplikat sebelum write.
3. `tests/service-checklist-component-catalog-session-s2000.test.js` mengharuskan `D.servisLogs.filter` langsung. Optimasi sesi menggunakan `slice(_newSessionLogStartIndex).filter` untuk membatasi scan ke baris sesi baru; assertion diperbarui untuk memeriksa bentuk yang benar.

## Validasi

- Skrip S2287: 11/11 PASS.
- Skrip S2288: 10/10 PASS.
- Tes terfokus presenter audit, checklist S2000, dan S2287/S2288: 13 tests, 13 pass, 0 fail.
- Tidak ada runtime source atau bundle yang diubah pada S2390.
- Full suite masih BELUM TERVERIFIKASI: percobaan seluruh suite terhenti oleh batas waktu tool sebelum laporan agregat. Empat kegagalan kontrak/fixture parsial teridentifikasi; seluruh suite wajib dijalankan ulang di lingkungan dengan waktu cukup.
- Release gate tetap BELUM TERVERIFIKASI karena `eslint` dan `esbuild` tidak tersedia di environment ini. Tidak ada klaim release-ready.

## Keputusan

S2390 memperbaiki ketidaksesuaian tes dan fixture tanpa mengubah perilaku runtime. ZIP kumulatif adalah artefak audit/patch, bukan deklarasi rilis produksi. Jalankan full suite, lint, minification/build, version integrity, bundle freshness, delete-manifest, dan release-final gates pada environment lengkap sebelum release.
