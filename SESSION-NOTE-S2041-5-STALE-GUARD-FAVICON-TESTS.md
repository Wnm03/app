# S2041.5 — Pulihkan guard stale-write (bug nyata), favicon, rapikan 7 tes gagal (v2282)

Akumulatif di atas S2041.2–S2041.4. Hasil build v2282.

## 1. BUG NYATA: `withSaveGuard`/`withSaveGuardAsync` tanpa preflight stale-write
- File live `modules/shared/features-helpers-global-security.js` mendefinisikan `_financeMutationBlockedByStaleState()` tetapi kedua wrapper tidak memanggilnya. Preflight hanya ada di salinan basi `modules/finance/features-helpers-global-security.js` (SCHEMA 7; TIDAK ada di build.js). Akibatnya penyimpanan Finance dari tab basi (data diubah di tab/perangkat lain) tidak diblokir di produksi.
- Fix: tambah `if(_financeMutationBlockedByStaleState())return false;` di kedua wrapper (live file). Verifikasi browser: normal -> jalan; `_crossTabStateStale=true` -> `false` (diblokir + toast); kembali normal -> jalan.
- Tes `s2462-finance-stale-write-and-input-guards` diarahkan ke file live (sebelumnya menguji salinan basi). 4/4 lulus.
- Catatan: salinan `modules/*/features-helpers-global-security.js` di finance/asset/shop adalah duplikat basi di luar build; kandidat pembersihan (belum dihapus, banyak dokumen/audit JSON merujuknya).

## 2. `perf-navigation-v1825` (6 tes) — salah target, bukan bug
Tes meng-assert string pada bundle MINIFY (esbuild mengubah kutip, mengganti nama variabel, membuang `const`), jadi hanya lulus pada build non-minify. Diarahkan ke source (`modules-render.js`, `aset-misc.js`, `modal-navigasi.js`); kesegaran bundle tetap dijaga `verify-bundle-freshness`. 7/7 lulus.

## 3. Favicon
`<link rel="icon" type="image/svg+xml" href="icon-192.svg">` di index.html & app_production.html. Sebelumnya tidak ada `<link rel=icon>` dan tidak ada favicon.ico, jadi browser meminta `/favicon.ico` -> 404 (dugaan penyebab 404 cold start di audit).

## Verifikasi
Suite penuh: 8.718 tes, 8.717 lulus, 0 gagal (sebelumnya 7 gagal pra-eksisting). Gate: bundle segar, window-expose, lazy-boundaries, performance-budget PASS. 0 error halaman di browser.

## Deploy
Upload ULANG semua file di ZIP. ZIP ini menggantikan ZIP v2281 sebelumnya.
