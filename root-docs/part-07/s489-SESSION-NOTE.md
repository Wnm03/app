# Sesi 489 — Owner Registry Core (langkah 1/5)

Ref: `PLAN-owner-registry-multi-session.md`, Gate #1 = **seed kosong** (dikunci di chat).

## Yang dikerjakan
- File baru `modules/shared/owner-registry.js` — `OwnerRegistry.listAll()` / `findOrCreate(name)`, struktur `D.ownerRegistry: [{id, name}]`. Pure, 0 dependency wajib ke modul lain, 0 UI.
- Daftar ke `scripts/build.js` (GROUP_B, setelah `multi-owner-engine.js`).
- Test baru `tests/s489-owner-registry.test.js` (8 test): create, lookup exact/case-insensitive, dedup by id bukan by name, validasi input kosong.
- Build `s489-owner-registry-core` → versi bundle v1218 → v1219.

## TANPA WIRING (sesuai scope S489)
0 sentuhan ke `aset.js`, `investasi-view.js`, `modals.js`, `titipanCommitmentModal` — itu S490/S491/S492.

## Verifikasi
- `node --test tests/*.test.js` → **3186/3186 lolos** (baseline 3178 + 8 baru, 0 regresi).
- `verify-window-expose.js` → lolos.
- `verify-bundle-freshness.js` → lolos.
- `verify-release-ready.js` → lolos dengan 2 override manual (eslint & esbuild tidak terpasang di sandbox — dicatat di `docs/RELEASE-GATE-LOG.md`, sama seperti S488).

## Next
S490 — wire `assetOwnersModal` (`aset.js`) ke `OwnerRegistry`.
