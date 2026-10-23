# Hasil Validasi S2701

## Lulus
- `node --check scripts/verify-window-expose.js` — PASS.
- `npm run build` — PASS; runtime version sinkron ke 2653; kedua bundle valid secara sintaks.
- `npm run verify-bundle` — PASS; bundle A/B segar terhadap sumber.
- `npm run audit:system-integrity` — PASS 7 gate; runtimeSources=414; HTML/SW versi 2653.
- `npm run audit:sot` — PASS.
- `npm run audit:production-readiness` — PASS 14/14.
- `npm run audit:carnotes-performance` — PASS (4 file inti).
- `npm run audit:patch-integrity` — PASS (87 file apply pada manifest akumulasi yang sudah ada; 0 delete entries).
- `node scripts/verify-window-expose.js` — PASS: 85 modul data-action diperiksa, 0 gagal expose, 455 deklarasi objek top-level, 504 file discan; 0,41 detik.
- Tes gate window-expose dan kontrak data-action — 34/34 PASS.
- Tes reminder/interval terkait (10 file) — 25/25 PASS.

## Status full suite dan batasan
- Run `TEST_FORCE_RERUN=1 TEST_SHARDS=32 npm run test:full` tidak selesai dalam batas eksekusi 300 detik. Karena itu, full suite fresh setelah perubahan S2701 **belum terverifikasi**.
- Runner dengan checkpoint lama melaporkan agregat 9.164 tes, 9.163 pass, 0 fail, 1 skipped; hasil checkpoint tersebut tidak diklaim sebagai full rerun fresh setelah S2701.
- `release-check` tidak diklaim lulus pada tahap ini.
- Browser E2E belum diverifikasi di lingkungan ini.
- Temuan baseline `audit:performance-budget` untuk `modern-ui-layer.css` yang melampaui budget masih terbuka; tidak ada aturan CSS dihapus secara spekulatif.

## Dampak optimasi S2701
Sebelumnya pemeriksaan expose memanggil pembacaan file berulang untuk setiap kandidat modul. Kini sumber JS/HTML dibaca sekali ke snapshot per eksekusi, lalu seluruh scan memakai snapshot tersebut. Regex, kriteria deteksi, urutan pemilihan deklarasi pertama, daftar modul yang diperiksa, dan hasil gate tetap sama. Tidak ada perubahan alur bisnis, API, kontrak data, maupun SOT.
