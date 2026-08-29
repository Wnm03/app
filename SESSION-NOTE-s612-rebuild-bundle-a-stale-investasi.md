# Sesi s612 — Rebuild app-bundle-a.min.js (BASI, blok tab Investasi)

## Diagnosis
`node scripts/verify-bundle-freshness.js` pada `app-main__33_.zip`:
- ❌ `app-bundle-a.min.js` BASI — hash source tidak cocok dengan hash tertanam
  di bundle (source sudah berubah sejak bundle terakhir di-build).
- ✓ `app-bundle-b.min.js` segar.

Semua modul Investasi ada di GROUP_A (`scripts/build.js`): `investasi.js`,
`investasi-view.js`, `investasi-list-view.js`, `investasi-tx-view.js`,
`investasi-watch-view.js` — semuanya dibundel ke `app-bundle-a.min.js`, persis
file yang basi. Ini akar masalah "tab Investasi 0 respons, 0 toast, Tambah
Holding tidak ada reaksi": browser menjalankan `app-bundle-a.min.js` versi
lama yang tidak berisi kode Investasi terbaru (atau versi sebelum dispatcher
`data-action` capture-phase/toast-fallback ada di grup ini).

0 bug logic ditemukan di source `investasi*.js` / `aset-misc.js` (setAsetTab)
— murni bundle-source mismatch, bukan kode salah.

## Fix
`node scripts/build.js` dijalankan penuh:
- Rebuild `app-bundle-a.min.js` & `app-bundle-b.min.js` dari source terkini.
- Versi disinkron: `s611` → **s612**, `?v=1452` → **`?v=1453`**,
  `CACHE_NAME` sw.js → `kw-cache-v1453`.
- `verify-bundle-freshness.js` setelah rebuild → ✅ kedua bundle segar.
- `verify-window-expose.js` → ✅ 77/77 modul ter-expose.
- `node --test tests/*.test.js` → **4907/4907 pass, 0 fail** (sebelum & sesudah
  rebuild — rebuild murni re-bundle, 0 source diedit).
- `verify-release-ready.js`: 2 gate gagal (lint/minify) karena sandbox tanpa
  akses jaringan (eslint & esbuild tidak terpasang) — bukan indikasi masalah
  kode; bundle TETAP valid (`node --check` lolos) hanya belum diminifikasi
  (lebih besar dari build sebelumnya, aman dipakai).

## Isi patch ini
Hanya file yang berubah dari rebuild (upload SEMUA, jangan cuma HTML/sw.js):
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `chat-action-handlers.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/shared/modals.js`, `modules/shared/modules-calc.js`,
`modules/shared/modules-render.js`, `FILE-MAP.md`, `COVERAGE-PER-MODULE.md`.

## Setelah upload
Di HP: tutup total PWA (bukan minimize) → buka lagi 2x berturut-turut supaya
Service Worker baru (`kw-cache-v1453`) benar-benar mengambil alih.
