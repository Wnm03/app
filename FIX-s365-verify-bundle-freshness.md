# FIX s365 — Verifikasi kesegaran bundle vs source tanpa build ulang (tier-2, lanjutan audit s360-s364)

## Latar belakang
`FIX-s362-scannersession-global-watchdog.md` mencatat sisa rekomendasi
tier-2: cegah pola bug **s326→s328** — patch S326 mengganti handler
tombol Bayar/Riwayat di *source*, tapi `app-bundle-b.min.js` yang beneran
dipakai browser sempat **tidak di-rebuild** sebelum upload, jadi tombol
tidak merespons di app sungguhan walau source-nya sudah benar. Ketahuan
lewat laporan user, bukan sebelum deploy.

`node scripts/build.js` sendiri tidak bisa mendeteksi pola ini — build.js
SELALU rebuild bundle tiap dipanggil, jadi kalau memang dijalankan, bundle
otomatis segar. Risikonya justru saat build.js **tidak dijalankan sama
sekali** sebelum upload (lupa, atau upload manual dari clone/branch lama).

## Perbaikan
- `scripts/bundle-hash.js` (baru) — hash SHA-256 dari gabungan isi source
  per grup bundle (`GROUP_A`/`GROUP_B`), plus helper baca/tulis marker.
- `buildBundle()` di `scripts/build.js` sekarang menulis marker
  `// __BUNDLE_SRC_HASH__:<hash>` di baris pertama tiap bundle — ditempel
  **setelah** langkah minify supaya tidak ikut kena strip komentar esbuild
  (jadi tetap ada baik bundle diminify maupun tidak).
- `scripts/verify-bundle-freshness.js` (baru) — skrip berdiri sendiri, TIDAK
  menjalankan build ulang, cuma baca marker di bundle & bandingkan dengan
  hash yang dihitung ulang dari source **saat ini**. Exit 1 kalau ada
  bundle basi/belum punya marker; exit 0 kalau semua segar. Daftar file per
  grup diambil langsung dari `GROUP_A`/`GROUP_B` di `build.js` via regex
  (bukan disalin manual) supaya tidak ada 2 sumber kebenaran yang bisa
  saling drift.
- `package.json` — tambah `npm run verify-bundle`.

## Verifikasi
- **Simulasi kasus asli**: source diubah manual TANPA rebuild →
  `verify-bundle-freshness.js` langsung menandai bundle terkait BASI dengan
  pesan yang jelas (exit 1). Source dikembalikan → status kembali segar
  (exit 0). Ini persis mensimulasikan skenario s326→s328.
- `tests/bundle-hash.test.js` (baru) — 6/6 pass (hash stabil untuk isi
  sama, berubah untuk 1 karakter berbeda, peka urutan file, round-trip
  marker, deteksi bundle lama tanpa marker).
- Full suite: `node --test tests/*.test.js` — 2185/2187 pass (baseline
  2179 + 6 baru), 2 fail sisanya PRE-EXISTING & tidak terkait (sama seperti
  sesi-sesi sebelumnya).
- `node scripts/build.js` — sukses, sintaks bundle valid, versi konsisten
  **1033**.
- `node scripts/verify-bundle-freshness.js` — kedua bundle segar setelah
  rebuild final.

## File yang berubah
- `scripts/bundle-hash.js` (baru)
- `scripts/verify-bundle-freshness.js` (baru)
- `scripts/build.js` (`buildBundle()` — marker hash)
- `tests/bundle-hash.test.js` (baru — 6 test regresi)
- `package.json` (`verify-bundle` script)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild rutin)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1031` → `?v=1033`

## Cara pakai (rekomendasi alur kerja)
Sebelum upload/deploy: `node scripts/build.js` lalu
`npm run verify-bundle` (atau langsung `node
scripts/verify-bundle-freshness.js`) sebagai langkah terakhir — kalau lolos,
aman diupload. Kalau proyek ini punya CI, cocok dipasang sebagai step
terpisah setelah build.

## Cakupan sisa (belum dikerjakan)
Rekomendasi tier-3 dari `FIX-s362`: elemen recovery visual untuk user awam
saat state `scanner-session-active` nyangkut (di luar scope patch ini).
