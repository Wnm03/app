# S519 — Dana Titipan ↔ Transaksi ↔ Talangan Linkage

**Status: S519 COMPLETE — IMPLEMENTED & VERIFIED**

## Ringkasan

Lanjutan Design Lock S518 (`DESIGN-S518-DANA-TITIPAN-TRANSAKSI-TALANGAN.md`),
scope expansion Opsi A. Menghubungkan transaksi (expense) ke owner Dana
Titipan lewat field opsional `titipanLinkId`/`titipanTalangan`, dengan
lifecycle piutang otomatis "Talangan Dana Titipan" (create/edit
delta-sync/unlink/owner-relink/delete cascade) + `usedTotal`/`talanganTotal`/
`available` per owner yang 100% derived on-read (0 counter persisten baru).

Detail lengkap implementasi, invariant audit, dan test evidence ada di
`docs/FIX-S519-DANA-TITIPAN-TRANSAKSI-TALANGAN.md`.

## Perubahan

| File | Sumber perubahan |
|---|---|
| `modules/finance/dana-titipan-portfolio-presenter.js` | `build()` — tambah derived `usedTotal`/`talanganTotal`/`available` per owner |
| `modules/finance/piutang-utang.js` | Baru — `maybeCreateTitipanTalanganPiutang()`, `syncTitipanTalanganPiutangOnEdit()`, `removeUnpaidTitipanTalanganPiutangForTx()` |
| `modules/finance/transaksi.js` | Baru — `resolveTxTitipanOwner()`, `applyTxTitipanLinkageOnSave()`; wiring ke jalur CREATE & EDIT (`_saveTxInner`) |
| `modules/finance/tx-list-cashflow.js` | `delTx()` — DELETE cascade piutang otomatis talangan (scope correction: cascade nyatanya ada di file ini, bukan `transaksi.js` seperti asumsi Design Lock) |
| `tests/s519-dana-titipan-transaksi-talangan-linkage.test.js` | **Baru** — 23 test regresi (LAPIS 3 murni, pola `s485b`/`s485c`) |

## Invariant terjaga (audit penuh di `docs/FIX-S519-...md` §6)

- Principal (`D.titipanCommitments[].principalAmount`) immutable — 0 path baru menulisnya.
- Asset ownership (`D.assets[].owners[]`/`a.nilai`) tidak tersentuh.
- `MultiOwnerEngine`/`OwnershipEngine` tidak diubah sama sekali.
- `available = max(0, principal - usedTotal - returnedTotal)`, `talanganTotal` subset `usedTotal` (tidak dikurangkan dua kali).
- 0 counter persisten baru di `titipanCommitments[]`.
- Idempotency `autoTxId`, delta-sync nominal, paid-piutang preservation di seluruh lifecycle (edit/unlink/owner-relink/delete).
- Transaksi lama tanpa field baru tetap valid & tidak ikut agregasi.

## Status

- **3397/3397 test PASS** (`node --test tests/*.test.js`), 0 gagal
  (3374 baseline v1250/S516 + 23 baru sesi ini).
- `node scripts/build.js s519-titipan-talangan-linkage` sudah dijalankan
  (versi eksplisit, bukan auto-increment — lihat `docs/RELEASE-GATE-LOG.md`
  entry S519 FINAL untuk alasan): versi `s516-dana-titipan-owner-nominal-asset-kuota-porsi`
  → `s519-titipan-talangan-linkage`, `?v=` **1250 → 1251**, `CACHE_NAME` →
  `kw-cache-v1251`. `app_production.html` sudah disinkronkan.
- `node scripts/verify-bundle-freshness.js`: **OK** (hash source cocok
  kedua bundle).
- `node scripts/verify-window-expose.js`: **OK** (68 modul window-expose
  lengkap).
- `node scripts/verify-release-ready.js`: **LOLOS** (gate `html-sync`
  hijau otomatis; gate `lint`/`minify` di-override manual karena
  eslint/esbuild tidak bisa diinstall di sandbox tanpa akses jaringan —
  tercatat di `docs/RELEASE-GATE-LOG.md`, konsisten pola override
  sesi-sesi sebelumnya di project ini, S508-S518).
- Bundle unminified (esbuild tidak tersedia) — sintaks lolos
  `node --check`, valid dipakai, hanya lebih besar ukurannya.

## Test corrections (bukan production bug — lihat detail §5 di `docs/FIX-S519-...md`)

- Test #17: `MultiOwnerEngine` di-load sebagai source tapi tidak
  di-exposed di `loadSource()` test harness — diperbaiki hanya di test.
- Test #9: data test pakai `porsi:0` (invalid menurut
  `MultiOwnerEngine.validateOwner()`) — diperbaiki hanya di test data.
