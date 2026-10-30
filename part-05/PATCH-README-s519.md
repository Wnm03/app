# PATCH s516 → s519 (Dana Titipan ↔ Transaksi ↔ Talangan Linkage)

## Status

- **3397/3397 test PASS** (`node --test tests/*.test.js`), 0 gagal
  (3374 baseline v1250/s516 + 23 baru sesi ini).
- `node scripts/build.js s519-titipan-talangan-linkage` sudah dijalankan:
  versi `s516-dana-titipan-owner-nominal-asset-kuota-porsi` →
  `s519-titipan-talangan-linkage`, `?v=` **1250 → 1251**, `CACHE_NAME` →
  `kw-cache-v1251`. `app_production.html` sudah disinkronkan.
- `node scripts/verify-bundle-freshness.js`: **OK** (hash source cocok
  kedua bundle).
- `node scripts/verify-window-expose.js`: **OK** (68 modul window-expose
  lengkap).
- `node scripts/verify-release-ready.js`: **LOLOS** (gate `html-sync`
  hijau otomatis; gate `lint`/`minify` di-override manual karena
  eslint/esbuild tidak bisa diinstall di sandbox tanpa akses jaringan —
  tercatat di `docs/RELEASE-GATE-LOG.md`, konsisten pola override
  sesi-sesi sebelumnya di project ini).
- Bundle unminified (esbuild tidak tersedia) — sintaks lolos
  `node --check`, valid dipakai, hanya lebih besar ukurannya.

## Fitur diimplementasikan sesi ini

`S519` — Dana Titipan ↔ Transaksi ↔ Talangan Linkage, mengikuti Design
Lock S518. Field opsional `titipanLinkId`/`titipanTalangan` pada
transaksi + lifecycle piutang otomatis "Talangan Dana Titipan"
(create/edit delta-sync/owner-relink/unlink/delete cascade) +
`usedTotal`/`talanganTotal`/`available` per owner (100% derived,
0 counter persisten baru). Detail lengkap:
`FIX-v1250-to-v1251-s519-titipan-talangan-linkage.md`,
`docs/FIX-S519-DANA-TITIPAN-TRANSAKSI-TALANGAN.md`.

## Isi patch (s516 → s519)

| File | Sumber perubahan |
|---|---|
| `modules/finance/dana-titipan-portfolio-presenter.js` | Fitur — `build()` tambah derived `usedTotal`/`talanganTotal`/`available` per owner |
| `modules/finance/piutang-utang.js` | Fitur — 3 fungsi baru: `maybeCreateTitipanTalanganPiutang()`, `syncTitipanTalanganPiutangOnEdit()`, `removeUnpaidTitipanTalanganPiutangForTx()` |
| `modules/finance/transaksi.js` | Fitur — 2 fungsi baru: `resolveTxTitipanOwner()`, `applyTxTitipanLinkageOnSave()`; wiring CREATE & EDIT (`_saveTxInner`) |
| `modules/finance/tx-list-cashflow.js` | Fitur — `delTx()` DELETE cascade piutang otomatis talangan |
| `tests/s519-dana-titipan-transaksi-talangan-linkage.test.js` | **Baru** — 23 test regresi (LAPIS 3 murni) |
| `FIX-v1250-to-v1251-s519-titipan-talangan-linkage.md` | **Baru** — release note sesi ini |
| `docs/FIX-S519-DANA-TITIPAN-TRANSAKSI-TALANGAN.md` | **Baru** — dokumentasi implementasi + invariant audit + test evidence |
| `docs/RELEASE-GATE-LOG.md` | Entry S519 (implementasi selesai + build/release final) |
| `app-bundle-a.min.js` / `app-bundle-b.min.js` / `app_production.html` / `index.html` / `sw.js` / `modules/shared/modals.js` / `modules/shared/modules-calc.js` / `modules/shared/modules-render.js` / `modules/shared/features-helpers-global-security.js` / `chat-action-handlers.js` | Version-bump otomatis (`scripts/build.js`) — hanya string versi/`?v=`/`CACHE_NAME`, 0 logic bisnis berubah |
| `docs/FILE-MAP.md` / `docs/COVERAGE-PER-MODULE.md` | Auto-regenerasi `scripts/build.js` |

## Invariant terjaga (audit penuh: `docs/FIX-S519-...md` §6, `docs/RELEASE-GATE-LOG.md`)

Principal immutable, asset ownership isolation, `MultiOwnerEngine`/
`OwnershipEngine` tidak diubah, `available` derived tanpa counter kedua,
piutang idempotency, edit-owner/unlink/delete cascade sesuai Design Lock,
backward compatible.

## Test corrections (bukan production bug)

- Test #17 — `MultiOwnerEngine` tidak exposed di test harness
  `loadSource()`, diperbaiki hanya di test.
- Test #9 — data test pakai `porsi:0` invalid
  (`MultiOwnerEngine.validateOwner()` menolak porsi≤0), diperbaiki hanya
  di data test.
