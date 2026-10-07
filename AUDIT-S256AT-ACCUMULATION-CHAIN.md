# S256AT — Audit rantai akumulasi (app-main 13 → S256AB..AP → S256AQ..AT)

Menggantikan paket kumulatif S256AQ (AQ dibawa utuh di sini). Payload patch-only terhadap `app-main (13)`: **44 file = 28 baru + 16 overwrite**; tidak ada file baseline dihapus; tidak ada file tak-berubah ikut sebagai delta palsu.

## Sesi baru
- **S256AQ** — `modern-ui-layer.css` 37.804 → 33.568 B (anggaran 35.000): hanya komentar panjang dipadatkan, aturan identik.
- **S256AR** — `a11y-runtime-census-modals.py`: mode ketat opsional `--strict-first-session` / `CENSUS_STRICT_FIRST_SESSION=1` (firstSessionBbm ≠ `ok` → exit 1). Default TETAP informasional. Terbukti: bundle basi saat ini → default exit 0, strict exit 1. Test `s256ar` (3).
- **S256AS** — **cacat diperbaiki:** `a11y-runtime-census.py` (AL) tidak pernah bisa gagal (tanpa `sys.exit`). Kini exit 1 bila ada page error, error WorthIt, mismatch pressed, urutan tab (ArrowRight/End/Home) atau expander menyimpang. Kontrol negatif sintetis: 4 jenis temuan terdeteksi; run nyata tetap bersih (`findings: []`). Test `s256as` (4) juga menjaga CSS S256AB dan census AM (8 halaman ada di HTML).
- **S256AT** — `AUDIT-S256AB-AN-RECONSTRUCTED.md` (rekonstruksi isi AB–AN dengan tingkat keyakinan) + test `s256at` (3) untuk perubahan tampilan reminder Servis yang sebelumnya tanpa tes (chip filter hitungan-0 disembunyikan, placeholder riwayat disembunyikan, tombol 44px).
- **S256AU** — `FILE-HASHES-SHA256.txt` disinkronkan: 28 hash basi diperbarui, 13 entri berpath `APP-MAIN-PATCH-S2027-S2030-FINAL/finalpatch/…` (folder tidak ada di baseline) dibuang → 110 entri, semua lolos `sha256sum -c`. Skrip baru `scripts/refresh-file-hashes.py --check|--write` + test `s256au` (4; file hasil build dikecualikan dari cek hash). **Setelah `npm run build`, jalankan `--write` karena bundle A/B, app_production.html, index.html, sw.js berubah.**
- Semua test baru diuji mutasi: merusak source → test gagal; dipulihkan → lulus.

## Hasil validasi (dijalankan; sandbox 1 CPU, 48 shard)
| | Baseline app-main 13 | Akumulasi S256AT |
|---|---|---|
| Full suite | 8530 / 8529 pass / 0 fail / 1 skip | 8596 / 8594 pass / 1 fail / 1 skip |
- +66 test dibanding baseline (56 dari AC–AO + 10 baru AR/AS/AT), semua lulus. Satu-satunya gagal: `s2511` (bundle B basi).
- Replay: baseline murni + ZIP = pohon akumulasi, byte-identik. `node --check`/compile semua JS/PY delta lulus. `verify-patch-integrity` (manifest S256AT) dan `verify-patch-contamination` lulus.
- Census runtime (Chromium): AL, AM, AN exit 0 pada bundle saat ini; AN `--strict-first-session` exit 1 (benar, bundle B basi).

## BELUM dikerjakan
1. **Rebuild bundle** (`npm run build`) + upload ulang `app-bundle-a/b.min.js` (B wajib). Sampai itu fix S256AO tidak aktif; gate `release-firewall`, `deploy-data-continuity-gate`, `verify-release-ready`, `release-contract-audit` tetap gagal (akar tunggal: bundle B basi + eslint/esbuild tidak tersedia di sandbox).
2. Setelah rebuild: `python3 scripts/a11y-runtime-census-modals.py app_production.html --strict-first-session` harus exit 0 (`firstSessionBbm: ok`). Lalu `verify-bundle`, `release:final-gate`, `verify:reproducible-build`, eslint.
3. Keputusan: jadikan `--strict-first-session` default setelah rebuild terbukti hijau?
4. Catatan asli sesi AB–AN tidak ada (hanya rekonstruksi, keyakinan sebagian rendah). Perubahan tampilan di `servis-b.js` hanya dijaga test statis, belum diverifikasi visual di perangkat.
5. ~~`FILE-HASHES-SHA256.txt` basi~~ — SELESAI di S256AU (lihat di atas); perlu `--write` ulang setelah build.
6. Ruang sisa tipis: bundle A ~18 KB & B ~33 KB dari anggaran; `app_production.html` ~1,3 KB; `features-helpers-global-security.js` 1726/1750 baris; CSS 1,4 KB.
7. Uji perangkat nyata belum ada (hanya Chromium headless).
