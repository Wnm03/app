# SA10b (v1569) — Perbaikan 3 gate sebelum SA10a boleh merge

Lanjutan dari `SESSION-NOTE-SA10a-eksternalisasi-script-block.md`. Sesi SA10a
sendiri mencatat "belum dijalankan: build.js, verify-window-expose,
verify-bundle-freshness, verify-release-ready — folder scripts/ tidak ada di
paket sesi itu". Sesi ini menjalankan build+full test suite dengan `scripts/`
lengkap tersedia, dan memperbaiki 3 hal yang ketahuan gagal.

## Temuan & perbaikan

### 1. `scripts/build.js` — build gagal total (hard stop)
Lint housekeeping `lintModalHtmlIndexDrift()` masih cari pola lama
`document.write(MODAL_HTML[N]);</script><!-- modal:xxx -->` di index.html.
SA10a mengubahnya jadi `<script src="modules/shared/modal-write.js?v=N"
data-modal-index="N"></script>`, jadi lint menemukan 0 kecocokan dan build
berhenti sebelum sempat generate bundle.

**Fix**: `writeRe` di `lintModalHtmlIndexDrift()` sekarang kenali KEDUA pola
(lama & baru dari SA10a) lewat alternation, supaya kalau suatu saat ada
campuran/rollback parsial pun drift tetap terdeteksi, bukan diam-diam
berhenti berfungsi.

### 2. `tests/boot-pin-idempotent.test.js` — 7 test gagal (pre-existing test, bukan test baru SA10a)
`extractControllerChangeIIFE()` cari IIFE controllerchange langsung di teks
mentah index.html/app_production.html. SA10a memindahkan blok itu ke
`modules/shared/boot-early.js` (bagian dari konsolidasi 4 blok boot-time).
Logic-nya identik (dicek manual — hasil sama, cuma lokasi pindah), tapi test
lama belum tahu soal pemindahan ini.

**Fix**: `extractControllerChangeIIFE()` sekarang fallback baca
`modules/shared/boot-early.js` kalau IIFE tidak ketemu inline di HTML yang
diberikan. Tidak ada assertion yang dilonggarkan — cuma sumber baca yang
disesuaikan dengan lokasi kode yang baru.

### 3. `sw.js` — CACHE_NAME tidak sinkron dengan `?v=` HTML
SA10a menaikkan `?v=1568` manual di 2 file baru + HTML (karena `scripts/`
tidak ada di paketnya), tapi tidak sempat jalankan `bump-version.sh` untuk
menyamakan `CACHE_NAME` di `sw.js` (masih `kw-cache-v1566`). Gate
`version-sync` di `verify-release-ready.js` menangkap ini dengan benar
(tidak bisa di-override) — persis tujuan gate itu dibuat.

**Fix**: jalankan `./scripts/bump-version.sh 1568` untuk sinkronkan, lalu
`node scripts/build.js` berjalan normal dan otomatis menaikkan lagi ke
**v1569** (versi final sesi ini) karena build.js selalu bump versi di setiap
build sukses.

## Verifikasi
- `node scripts/build.js` → ✅ build sukses, `index.html` & `app_production.html`
  sinkron, `sw.js` CACHE_NAME `kw-cache-v1569`.
- `node --test tests/*.test.js` → **5554 pass, 0 fail** (naik dari base 5544
  + 10 test baru SA10a, semua termasuk 7 test boot-pin-idempotent yang
  sebelumnya gagal).
- `node scripts/verify-window-expose.js` → ✅ OK.
- `node scripts/verify-bundle-freshness.js` → ✅ kedua bundle segar (isi
  bundle TIDAK berubah dari SA10a — modal-write.js/boot-early.js tetap
  non-bundled sesuai desain).
- `node scripts/verify-release-ready.js` dengan override lint+minify
  (konsisten dgn seluruh sesi SA1-SA10 sebelumnya, sandbox tanpa akses
  jaringan) → ✅ **RELEASE GATE LOLOS**.

## File yang berubah (akumulatif dari SA10a + fix sesi ini)
- `index.html`, `app_production.html` — dari SA10a, plus versi naik ke 1569
  hasil build.js.
- `sw.js` — CACHE_NAME disamakan ke `kw-cache-v1569`.
- `modules/shared/modal-write.js`, `modules/shared/boot-early.js` — baru,
  dari SA10a (tidak diubah isi logic-nya di sesi ini).
- `scripts/build.js` — fix regex `lintModalHtmlIndexDrift()`.
- `tests/boot-pin-idempotent.test.js` — fix `extractControllerChangeIIFE()`.
- `tests/csp-script-src-sa10a.test.js` — dari SA10a (tidak diubah).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`
  — auto-regenerated oleh build.js/release-gate.

## Carry-forward (tidak berubah dari SA10a)
- Epic `'unsafe-eval'` (opsional).
- Kompatibilitas `script-src-attr` di Safari/WebKit.
