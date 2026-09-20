# S1862 — Bundle rebuild (koreksi bundle basi)

ZIP kumulatif S1862 sebelumnya membawa `app-bundle-a/b.min.js` yang sudah berisi
string versi `s1862-sa-i-cumulative-audit-1828` tetapi marker `__BUNDLE_SRC_HASH__`
masih milik patch sebelumnya (`3b3707e022d48002` / `c867e4fda8b36a02`), sehingga
`verify-bundle-freshness.js` dan `verify-release-ready.js` menolaknya.

Perbaikan: `node scripts/build.js s1862-sa-i-cumulative-audit-1828` (versi
eksplisit, tanpa bump — tetap 1828). Hash marker sekarang cocok dengan source
(`6c183ec18937d3c0` / `88a4a32708fee7c1`).

Semua 50 file dari ZIP kumulatif sebelumnya tetap ada; yang berubah hanya
`app-bundle-a.min.js`, `app-bundle-b.min.js`, dan `docs/RELEASE-GATE-LOG.md`.
Tidak ada penghapusan baru (`DELETE-FILES.txt`: `pro-ui-layer.css`).

Catatan: bundle belum diminify (esbuild tak tersedia di environment build).
