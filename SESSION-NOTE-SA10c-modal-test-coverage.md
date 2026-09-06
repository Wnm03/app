# SA10c (v1570) — Sesi ringan: tutup 2 gap coverage/dokumentasi dari review SA10b

Lanjutan dari `SESSION-NOTE-SA10b-gate-fixes-sebelum-merge.md`. Sesi itu
menyelesaikan 3 blocker rilis; review setelahnya menemukan beberapa gap
housekeeping non-blocking. Sesi ini (ringan, scope dibatasi) mengerjakan 2
yang paling bernilai & murah:

## 1. `tests/modal-html-index-drift.test.js` — dibuat (sebelumnya cuma disebut di komentar, tidak pernah ada)

`scripts/build.js` (sejak jauh sebelum SA10a) punya komentar "Versi test
unit (utk `npm test`) ada di `tests/modal-html-index-drift.test.js`" — tapi
file itu tidak pernah dibuat. Akibatnya lint drift MODAL_HTML index HANYA
jalan saat `node scripts/build.js` dieksekusi, tidak ikut ke-cover kalau
orang cuma jalankan `npm test`/`node --test` tanpa build penuh. Ini juga
persis kenapa fix SA10b (update regex `writeRe`) sempat tidak ketahuan
kalau ada test terpisah yang harusnya juga diupdate — tidak ada test
terpisah itu.

**Perbaikan**: logic `lintModalHtmlIndexDrift()` diekstrak dari
`scripts/build.js` ke modul baru `scripts/lib/modal-html-index-drift.js`
(fungsi murni `checkModalHtmlIndexDrift(rootDir, htmlFiles)`, tidak
bergantung ke closure `build.js`). `scripts/build.js` sekarang tinggal
`require()` modul ini. Test baru `tests/modal-html-index-drift.test.js`
(5 test) memakai modul yang SAMA — jadi build.js & `npm test` dijamin
selalu mengecek pola yang identik, tidak bisa diam-diam drift lagi seperti
yang nyaris terjadi di SA10a→SA10b.

## 2. `tests/modal-write.test.js` — dibuat (sebelumnya cuma smoke test manual)

`modules/shared/modal-write.js` (file baru dari SA10a) sebelumnya cuma
diverifikasi lewat smoke test manual (`node -e ...` mensimulasikan
`document.currentScript`, dicatat di SESSION-NOTE-SA10a) — tidak permanen,
tidak ikut `npm test`.

**Perbaikan**: 6 test baru mengunci: baca `data-modal-index` dari
`document.currentScript`, index "0" (falsy tapi valid) tetap ditulis,
`currentScript` null / index bukan angka / index di luar jangkauan /
`MODAL_HTML` belum terdefinisi -> semuanya gagal-senyap TANPA throw
(sesuai desain aslinya), dengan `console.error` sbg jejak untuk kasus
index-di-luar-jangkauan.

## Tidak dikerjakan sesi ini (scope sengaja dibatasi, "sesi ringan")

- `modules/shared/boot-early.js` masih belum ada unit test langsung
  (di luar bagian controllerchange yang sudah dikunci
  `boot-pin-idempotent.test.js`) — 3 blok lain (`_loadScriptOnce`/`ensure*`,
  `window.__moduleLoadFail`, Eruda debug console) belum ditest.
- Rotasi `docs/RELEASE-GATE-LOG.md` (sudah 500+ baris) — housekeeping,
  bukan risiko fungsional.
- `scripts/cleanup-backups.js` dijalankan (dry-run) sesi ini, tidak ada yang
  perlu dihapus di kondisi repo saat ini.

## Verifikasi
- `node --test tests/*.test.js` → **5565 pass, 0 fail** (naik dari 5554 di
  SA10b: +5 modal-html-index-drift, +6 modal-write, semuanya baru & lolos
  langsung/GREEN — tidak ada perubahan behavior, murni nambah coverage).
- `node scripts/build.js` → ✅ build sukses, versi naik ke **v1570**
  (index.html, app_production.html, sw.js CACHE_NAME semuanya sinkron).
- `node scripts/verify-window-expose.js` → ✅ OK.
- `node scripts/verify-bundle-freshness.js` → ✅ kedua bundle segar (isi
  bundle TIDAK berubah — modal-html-index-drift.js & test baru semuanya
  non-bundled/tooling, bukan runtime app code).
- `node scripts/verify-release-ready.js` dengan override lint+minify
  (konsisten dgn seluruh sesi sebelumnya) → ✅ **RELEASE GATE LOLOS**.

## File yang berubah/ditambah sesi ini
- **Baru**: `scripts/lib/modal-html-index-drift.js` (logic diekstrak dari
  build.js), `tests/modal-html-index-drift.test.js`,
  `tests/modal-write.test.js`.
- **Diubah**: `scripts/build.js` (`lintModalHtmlIndexDrift()` sekarang
  delegasi ke modul lib, bukan implementasi inline).
- **Auto-regenerated**: `index.html`, `app_production.html`, `sw.js`
  (versi naik ke v1570), `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md`.
