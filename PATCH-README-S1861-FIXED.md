# PATCH S1861 — SaveFlush / Cache Hardening (FIXED, kumulatif)

Basis: `app-main (6)` (sudah berisi full stack S1860, bundle segar @ v1825).
Hasil: versi **1827** — `s1861-saveflush-cache-hardening-1827`.

## Isi patch

Semua file source S1861 yang asli tetap ada (tidak ada yang hilang), ditambah
dua koreksi di bawah.

### Koreksi 1 — bundle di ZIP asli BASI

ZIP S1861 asli mengirim `app-bundle-a.min.js` / `app-bundle-b.min.js` yang masih
membawa marker hash source lama (`0b1f86137c2602b4` / `70152beea60f9e19`, milik
v1825), padahal 5 file source ikut berubah (`modals.js`, `modules-calc.js`,
`modules-render.js`, `features-helpers-global-security.js`,
`chat-action-handlers.js`). `scripts/verify-bundle-freshness.js` menolaknya, dan
kalau di-deploy apa adanya perubahan S1861 tidak aktif di runtime.

Perbaikan: `node scripts/build.js` dijalankan ulang → bundle segar
(`8d180938052b778a` / `faa79dee1660ed65`), versi 1826 → 1827, `index.html`,
`app_production.html`, dan `sw.js` ikut sinkron.

### Koreksi 2 — `tests/perf-navigation-v1825.test.js` mengunci nomor versi

Test `performance patch is cache-busted to v1826` meng-assert literal `?v=1826`
dan `kw-cache-v1826`, jadi pecah setiap kali `build.js` menaikkan versi — pola
brittle yang sama dengan 7 test yang sudah dikoreksi di S1860.

Perbaikan: test dibaca ulang jadi kontrak perilaku — versi diambil dari
`index.html`, lalu dipastikan identik di `app_production.html` dan `sw.js`.
Nama test jadi `performance patch is cache-busted & sinkron lintas
index/app_production/sw`. Tidak ada source runtime yang disentuh agar test lewat.

## Verifikasi di tree hasil patch

- Full suite: **7102 tests / 7102 pass / 0 fail / 0 cancelled / 0 skipped**
  (`node scripts/run-full-test.js`, 32 shard).
- `verify-release-ready.js`: **LOLOS** (2 gate di-override sandbox: lint karena
  eslint tidak terpasang, minify karena esbuild tidak jalan).
- `verify-bundle-freshness.js`: segar.
- `verify-window-expose.js`: OK — 82 modul.
- `s1860-app-wide-hardening-gate.js`: 9/9 kontrak.
- `service-sot-integrity-gate.js`: **PASS** (sebelumnya FAIL di sub-gate FULL
  REGRESSION karena test v1826 di atas).
- `sot-integrity-gate`: runtimeSources=377, version/html/sw semua 1827.

## Catatan deploy

Bundle di ZIP ini **belum diminify** (esbuild tidak tersedia di environment
build). Valid dan aman dipakai, tapi ukurannya lebih besar. Untuk rilis nyata:
`npm install --save-dev esbuild` lalu `node scripts/build.js` sekali lagi —
ingat itu akan menaikkan versi ke 1828, dan test cache-bust sekarang sudah
version-agnostic jadi tidak akan pecah lagi.

## Tidak ada penghapusan file baru

`DELETE-FILES.txt` S1860 (`pro-ui-layer.css`, `modules/modules-render.js`) sudah
ter-apply di baseline `app-main (6)`; blok `BEGIN_DELETE_FILES` di manifest kosong.
