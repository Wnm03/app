# SA10d (v1571) — Sesi ringan lanjutan: test coverage utk boot-early.js blok 1-3

Lanjutan dari `SESSION-NOTE-SA10c-modal-test-coverage.md`. Mengerjakan item
carry-forward yang sengaja ditunda di SA10c: unit test langsung utk
`modules/shared/boot-early.js`.

## Yang dikerjakan

`tests/boot-early.test.js` (14 test baru) — mengunci 3 dari 4 blok di file
ini yang SEBELUMNYA tidak pernah ada test permanen (blok 4/4,
controllerchange anti-flash, sudah dikunci `boot-pin-idempotent.test.js`
sejak SA10b, tidak diulang):

- **Blok 1/4 (Eruda debug console)**: toggle `?debug=1`/`?debug=0` lewat
  URL, persist ke `localStorage`, dan kondisi kombinasi (flag sudah aktif
  dari sesi sebelumnya tanpa param URL apa pun) — 4 test.
- **Blok 2/4 (`_loadScriptOnce`/`ensure*`)**: caching promise (2 panggilan
  src sama sebelum resolve -> 1 elemen `<script>`, promise identik), sukses
  di percobaan pertama, gagal pertama -> retry otomatis 1x dgn
  cache-buster `_retry=`, gagal total -> reject dgn pesan yg benar & cache
  dibersihkan (panggilan berikutnya mulai dari awal lagi, bukan reuse
  promise gagal), plus 1 test generik memverifikasi keenam `ensure*()`
  (`ensureTesseract`, `ensureJsPDF`, `ensureHtml2Canvas`, `ensureGoogleGSI`,
  `ensureXLSX`, `ensureZXing`) masing-masing memuat URL CDN yang benar —
  8 test.
- **Blok 3/4 (`__moduleLoadFail` & runtime error banner)**: banner
  ditampilkan dgn nama modul & bisa ditutup, guard anti-spam
  `__runtimeErrorBannerShown` (banner cuma tampil sekali walau dipanggil
  berkali-kali), listener global `error` & `unhandledrejection` meneruskan
  pesan+lokasi ke banner — 4 test.

Semua test murni membaca perilaku dari SUMBER file lewat `vm` sandbox
(pola yang sama dgn test lain di proyek ini, bukan re-implementasi
manual), dan semuanya lolos langsung (GREEN) tanpa perlu ubah kode
`boot-early.js` — murni menambah coverage, tidak ada perubahan behavior.

## Tidak dikerjakan (carry-forward tetap)

- Rotasi `docs/RELEASE-GATE-LOG.md` — housekeeping, bukan risiko
  fungsional, sengaja tetap ditunda.

## Verifikasi
- `node --test tests/*.test.js` → **5579 pass, 0 fail** (naik dari 5565 di
  SA10c: +14 test baru `boot-early.test.js`).
- `node scripts/build.js` → ✅ build sukses, versi naik ke **v1571**.
- `node scripts/verify-window-expose.js` → ✅ OK.
- `node scripts/verify-bundle-freshness.js` → ✅ kedua bundle segar (isi
  bundle TIDAK berubah — penambahan sesi ini murni file test).
- `node scripts/verify-release-ready.js` dengan override lint+minify
  (konsisten dgn seluruh sesi sebelumnya) → ✅ **RELEASE GATE LOLOS**.

## File yang berubah/ditambah sesi ini
- **Baru**: `tests/boot-early.test.js`.
- **Auto-regenerated**: `index.html`, `app_production.html`, `sw.js`
  (versi naik ke v1571), `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md`.
