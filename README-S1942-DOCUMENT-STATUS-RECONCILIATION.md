# S1942 — Document Status Reconciliation

## Tujuan
Menyelaraskan dokumen historis dengan kondisi source/test terbaru tanpa menghapus sejarah dan tanpa refactor business logic.

## Implementasi
- `docs/PROJECT-STATUS-REGISTRY.md` menjadi SOT status pekerjaan.
- `docs/KNOWN-ISSUES-REGISTRY.md` memisahkan bug aktif, limitation, environment boundary, dan backlog.
- `scripts/document-status-audit.js` menjadi release gate.
- `tests/s1942-document-status-registry.test.js` mengunci kontrak dokumentasi.
- Owner Resolver Audit-9 mendapat regression proof untuk sumber owner dari linked asset.
- `minimal-ui-theme.css` memperkuat `--text3` agar memenuhi target kontras normal-text yang diaudit.
- `docs/AUDIT_MATRIX.md` baseline count disinkronkan dengan repo aktif.

## Tidak disentuh
- rumus finansial
- schema persistence
- Car Notes service logic
- import/export semantics
- resolver priority
- asset ownership semantics
- runtime performance algorithms tanpa profiling browser

## Verification boundary
Full suite dan browser/device smoke tetap membutuhkan environment yang sesuai. S1942 tidak mengubah timeout menjadi PASS dan tidak menganggap bundle unminified sebagai production-minified.

## Addendum (akumulasi): fix test S1930 brittle version literal
`tests/s1930-mobile-ui-cache-hardening.test.js` sebelumnya meng-hardcode
`assert.match(m[1], /^s1930-mobile-ui-cache-hardening-1930$/)` — literal
angka versi sesi lama. Setiap kali `APP_BUILD_VERSION` naik (yang memang
terjadi tiap build), assertion ini otomatis gagal walau tidak ada regresi
build-identity sungguhan. Diganti jadi cek format umum
`/^[a-z0-9-]+-\d+$/`, sisa test (konsistensi versi lintas
bundle/HTML/sw.js) tidak diubah — tetap murni test-only, tidak menyentuh
business logic. Full suite sekarang **7343/7343 pass** setelah build ke
`s1942-document-status-reconciliation-1944`.
