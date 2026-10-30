# Patch s750 — Poin #1 (cleanup dead code) & #2 (refresh audit baseline)

## Poin #1: bersihkan sisa `pro-shop-list`
- `modules/vehicle/pro-mockup-presenter.js`: hapus 2 baris dead
  `querySelector('.pro-shop-list')` (aman, sebelumnya no-op krn
  `if(list)` guard, elemen sudah tidak pernah ada sejak patch 1752).
- `pro-ui-layer.css`: hapus dead CSS `.pro-shop-list`/`.shop-icon` dkk.
- Efek samping ditemukan: test lama `pro-mockup-data-driven-1724.test.js`
  assert string yang ada di baris yang dihapus — diperbaiki (1
  assertion dihapus + komentar), assertion lain di test yg sama TETAP
  valid.
- Test baru `carnotes-shop-list-removal-s749.test.js`: guard permanen
  supaya `pro-shop-list` tidak balik lagi tanpa sengaja.

## Poin #2: refresh docs/AUDIT_MATRIX.md
Tabel "Coverage Baseline" diupdate ke angka sungguhan (dihitung pakai
logic sama persis dgn `lintDocsBaselineCountDrift()` di build.js).
Setelah build, auto-check konfirmasi **0 drift** (sebelumnya 5 baris
drift: Total files, JavaScript, Markdown, JSON, CSS).

## Verifikasi
- Full test suite: **6861/6861 PASS, 0 FAIL** (berkali-kali sepanjang
  sesi, semua identik).
- Build: `node scripts/build.js s750-carnotes-cleanup-audit-baseline-1754`
  sukses → `?v=1754`.
- `verify-window-expose.js` & `verify-bundle-freshness.js`: PASS.
- `service-sot-integrity-gate.js` langsung: PASS penuh. Nested lewat
  `verify-release-ready.js`: FAIL (batasan sandbox, pola sama sesi
  sebelumnya, bukan regresi kode).

## Poin #3 (TIDAK dikerjakan, cuma rekomendasi — lihat chat)
6 file oversized (>1600 baris): `scripts/build.js` (2506),
`sparepart-servis.js` (2327), `modules-render.js` (2236), `servis.js`
(2090), `shop/modules-render.js` (2000), `aset-owners.js` (1771).

## Cara pakai
Timpa semua file ZIP ini ke project penuh (flatten `tests/part-*` ke
`tests/`), lalu `node --test tests/*.test.js` utk konfirmasi mandiri.
