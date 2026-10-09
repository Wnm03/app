# S2041.8 — Pesan guard stale-write netral + lint e2e hijau (v2284)

Akumulatif di atas S2041.2–S2041.7. Baseline: app-main (9) = v2279. Delta-only terhadap baseline; ZIP ini menggantikan S2041-7.

## 1. Guard stale-write melindungi banyak modul, pesannya salah
`withSaveGuard`/`withSaveGuardAsync` (modules/shared/features-helpers-global-security.js) dipakai bukan hanya Finance: servis, aset, kasir, etalase, produsen, order, acc, bill, debt, eduFund, piutang, titipanExpense. Sejak S2041.5 semuanya ikut diblokir saat tab basi (`_crossTabStateStale`), tetapi toast berbunyi "...perubahan Finance...".
- Perilaku pemblokiran TIDAK diubah (tetap melindungi data dari penimpaan tab basi). Hanya teks toast dibuat netral: "Muat ulang aplikasi sebelum menyimpan perubahan agar data lama tidak menimpa data terbaru."
- Salinan basi `modules/finance/features-helpers-global-security.js` (di luar build) tidak disentuh.
- Efek yang perlu diketahui: selama flag basi aktif, simpan di semua modul di atas gagal sampai aplikasi dimuat ulang.

## 2. Release gate lint
`e2e/run-e2e.js` memakai `process`/`__dirname` tetapi tidak tercakup override Node di `eslint.config.js` -> 8 error `no-undef` (ada sejak baseline) yang memblokir `verify-release-ready`. Fix: `'e2e/**/*.js'` ditambahkan ke daftar file override Node. Lint: 0 error; `verify-release-ready` kini LOLOS.

## Tes
Baru: `tests/s2041-8-stale-guard-neutral-message-eslint-e2e.test.js` (2 tes).

## Build
`node scripts/build.js --require-minify`: 2283 -> 2284 (HTML, sw.js CACHE_NAME, stempel versi, FILE-MAP, COVERAGE, kedua bundle).

## Belum dikerjakan (butuh keputusan / perangkat nyata)
- Daftar stok sparepart masih tanpa batas baris (9 node/baris); perlu keputusan UI ("tampilkan lebih banyak").
- `pwa-ui-layer.css` 14.987/15.000 byte budget (sisa 13 byte) -- perubahan CSS berikutnya akan menabrak gate.
- Penyebab 404 cold start belum terbukti; cek tab Network di deploy nyata.
- HP fisik, scroll FPS, offline/SW, Safari/iOS.

## Deploy
Upload ULANG semua file di ZIP (bundle A & B, kedua HTML, sw.js, eslint.config.js).
