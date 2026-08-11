# FIX v1138 -> v1139 (s424) — Perbaiki keandalan build/lint

## Konteks

Rencana Sesi 424 (item ke-2 dari rencana perbaikan, hasil review Sesi
423): keandalan `esbuild`/`npm run lint` selama ini cuma "dicatat di
komentar/FIX-*.md" (mis. "esbuild tidak tersedia, UNMINIFIED") tanpa ada
apapun yang benar2 MEMBLOKIR rilis kalau itu terjadi — dan project ini
TIDAK memakai `scripts/release.sh` (butuh git repo persisten) dalam
praktiknya; alur kerja nyatanya adalah ZIP per sesi (`docs/ZIP_RULES.md`).
Jadi guard `--require-minify`/`REQUIRE_MINIFY=1` yang sudah ada di
`build.js` sebelumnya TIDAK PERNAH benar2 dipakai di alur ZIP-per-sesi
ini — cuma aktif kalau seseorang menjalankan `release.sh` (jarang/tidak
pernah di environment sandbox tanpa git).

## Perubahan

### 1. `package.json` — esbuild: `optionalDependencies` -> `devDependencies`

```diff
-  "optionalDependencies": {
+  "devDependencies": {
+    "eslint": "^9.19.0",
     "esbuild": "^0.24.0"
   },
```

Alasan: `optionalDependencies` bisa gagal terpasang **diam-diam** (mis.
platform mismatch) tanpa membuat `npm install` exit non-zero — CI/sandbox
bisa "sukses" install tapi sebenarnya esbuild tidak ada. Sebagai
`devDependency` biasa, kegagalan install esbuild akan membuat `npm
install` gagal keras & terlihat jelas, bukan cuma ketahuan belakangan
lewat bundle yang tiba-tiba besar.

**Dicoba dijalankan sesi ini**: `npm install esbuild --save-dev` ->
**gagal**, `npm error code E403 — 403 Forbidden — GET
https://registry.npmjs.org/esbuild`. Sandbox ini memang tidak punya akses
jaringan keluar (konsisten dengan seluruh sesi sebelumnya, lihat
`docs/CATATAN-CEK-CLAUDE.md`). Perubahan `package.json` tetap berguna
untuk environment LAIN yang punya akses jaringan (mis. laptop dev user)
— kegagalan install di sana sekarang akan terlihat jelas, bukan diam-diam
fallback ke unminified.

### 2. `scripts/verify-release-ready.js` (BARU) — gate wajib sebelum ZIP

Gate baru, terpisah dari `npm run check`/`build.js`, dipanggil manual
(`npm run release-check`) SETELAH build, SEBELUM bikin ZIP — mengisi
celah yang disebut di atas: `--require-minify` yang sudah ada tidak
pernah aktif di alur ZIP-per-sesi ini.

Mengecek 2 gate independen:

| Gate | Kondisi lolos | Kondisi block | Bisa di-override? |
|---|---|---|---|
| Lint | `eslint .` jalan, 0 error | eslint tidak tersedia (env) | Ya — `CONFIRM_LINT_UNAVAILABLE_REASON="..."` |
| Lint | — | eslint jalan, ADA error sungguhan | **TIDAK** — wajib diperbaiki |
| Minify | Bundle hasil esbuild (tidak ada marker "DIBUAT OTOMATIS...") | Bundle fallback unminified | Ya — `CONFIRM_UNMINIFIED_REASON="..."` |
| Minify | — | Bundle belum ada sama sekali | **TIDAK** — jalankan `npm run build` dulu |

Override APAPUN (harus berisi alasan nyata, bukan string kosong) dicatat
**permanen** ke `docs/RELEASE-GATE-LOG.md` (append-only, ditulis
OTOMATIS oleh skrip — bukan manual) — beda dari sebelumnya yang cuma
catatan prosa di FIX-*.md yang gampang jadi template kosong. Ini
menjawab langsung poin task: "kalau fallback ke unminified, BLOCK (jangan
cuma catat di komentar) sampai dikonfirmasi manual."

### 3. `package.json` — script baru

```json
"release-check": "node scripts/verify-release-ready.js",
```

### 4. `docs/ZIP_RULES.md` — langkah baru "Release Gate" disisipkan antara
Build dan ZIP di urutan wajib, dengan penjelasan lengkap cara pakai &
kapan boleh/tidak boleh di-override.

### 5. `docs/SESSION_RULES.md` — format catatan sesi WAJIB sekarang
menyertakan "Status lint & release gate" dengan 3 kemungkinan status
konkret (Lolos / Tidak tersedia+di-override / Gagal+diperbaiki) — bukan
lagi kalimat generik "lint tidak bisa dijalankan" tanpa detail. Ini
langsung menjawab poin task ke-2 Sesi 424.

### 6. `scripts/build.js` — komentar diperbarui (bukan logic) untuk
konsisten dengan perubahan `optionalDependencies` -> `devDependencies`
dan merujuk ke gate baru `verify-release-ready.js`.

## Status lint & release gate — Sesi 424 (format WAJIB baru, lihat SESSION_RULES.md)

**Status: Tidak tersedia, di-override.**

- `eslint .` — **tidak tersedia**: sandbox ini tidak punya akses
  jaringan keluar, `npm install eslint` gagal `E403 Forbidden`. Bukan
  hal baru — konsisten dengan seluruh sesi sebelumnya sejak awal proyek.
- Minifikasi esbuild — **tidak tersedia**, alasan sama (`npm install
  esbuild` -> `E403 Forbidden`).
- Kedua gate **di-override manual** lewat `CONFIRM_LINT_UNAVAILABLE_REASON`
  / `CONFIRM_UNMINIFIED_REASON` dengan alasan lengkap (kutipan error npm,
  verifikasi manual yang dilakukan, ukuran bundle unminified). Entri
  audit lengkap ada di `docs/RELEASE-GATE-LOG.md`, timestamp
  `2026-08-06T20:56:09.121Z`.
- `node scripts/verify-release-ready.js` (tanpa override) dijalankan
  dulu untuk **membuktikan gate ini benar-benar BLOCK by default**
  (exit 1) sebelum override diberikan — bukan asumsi.

## Test

`node --test tests/*.test.js` -> **2864/2864 pass, 0 fail** (2857 lama +
7 baru di `tests/verify-release-ready-s424.test.js`: unit test
`checkMinified()`/`readAppVersion()`, + 3 test end-to-end lewat child
process dengan eslint palsu di `PATH` yang membuktikan 3 skenario:
(a) minify-only-block, (b) lint-error-sungguhan-tidak-bisa-di-override,
(c) unavailable+override-valid -> lolos & audit log bertambah).

## Build

`node scripts/build.js s424-release-gate-lint-esbuild-reliability` ->
sukses, sintaks kedua bundle valid, versi `v1138` -> `v1139`.

## File yang berubah

- `scripts/verify-release-ready.js` — BARU
- `tests/verify-release-ready-s424.test.js` — BARU, 7 test
- `package.json` — `esbuild` pindah ke `devDependencies`, script
  `release-check` baru
- `scripts/build.js` — komentar diperbarui (esbuild dependency type,
  rujukan ke gate baru); TIDAK ADA perubahan logic
- `docs/ZIP_RULES.md` — langkah "Release Gate" baru
- `docs/SESSION_RULES.md` — format catatan sesi: field "Status lint &
  release gate" baru + aturan 3 status konkret
- `docs/RELEASE-GATE-LOG.md` — BARU (dibuat otomatis oleh
  `verify-release-ready.js` saat override pertama dipakai, sesi ini)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/business/shop-data-io-api.js`,
  `chat-action-handlers.js`, `modules/shared/multi-owner-engine.js`,
  `modules/shared/features-helpers-global-security.js`,
  `modules/shop/generic/product-repository.js` — konstanta versi naik ke
  `s424-release-gate-lint-esbuild-reliability`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1138`
  -> `?v=1139`
- `backups/` — 2 file backup bundle lama dari build s423 sebelumnya
  (otomatis oleh `build.js`)

## Belum dikerjakan / batasan yang diketahui

- Gate `verify-release-ready.js` ini divalidasi dgn eslint PALSU (shell
  script sederhana yang exit 0/1) untuk 3 skenario, BUKAN dengan eslint
  sungguhan — karena eslint sungguhan tidak bisa dipasang di sandbox ini
  (sama seperti masalah yang gate ini sendiri dibuat untuk tangani).
  Kalau eslint sungguhan punya perilaku exit-code/output yang beda dari
  asumsi di `UNAVAILABLE_SIGNAL_RE`, deteksi "unavailable vs failed"
  bisa perlu disesuaikan — sebaiknya divalidasi ulang di environment yang
  punya eslint terpasang sungguhan sebelum terlalu diandalkan.
- **Sesi 425** (rencana berikutnya): duplikasi `index.html` /
  `app_production.html` — TIDAK disentuh sesi ini, di luar scope.
