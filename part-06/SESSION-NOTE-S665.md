# Sesi S665 — Owner Settlement (titipan/milik) untuk D.assets[] (Buku Aset)

## Konteks

Lanjutan dari daftar "Ide lanjutan" user, kategori "Sedang": port
`Investment.getOwnerSettlement()`/`setOwnerSettlement()`/
`holdingsByOwnerSettlement()` (S660) ke domain Aset, sesuai catatan
"Belum dikerjakan" sejak S660.

## Perubahan sesi ini

**1 file source disentuh**: `modules/asset/aset-owners.js`
(`AssetOwnersMixin`). `modules/asset/aset.js` **TIDAK disentuh**.

- `Aset.getOwnerSettlement(a, ownerId)` / `Aset.setOwnerSettlement(id,
  ownerId, settlement)` — port 1:1 semantik `Investment.getOwnerSettlement()`
  /`setOwnerSettlement()`. Data di `a.ownerSettlement` (map ownerId->'titipan'
  |'milik'), default toleran 'titipan' (0 regresi data existing). Sync
  lewat `TitipanSync.reconcile(a)` kalau ada, fallback `Aset._syncOwnerDebts(a)`
  — pola sama call-site lain di file ini.
- `Aset.assetsByOwnerSettlement(ownerId, settlement)` — query murni, port
  dari `Investment.holdingsByOwnerSettlement()`.
- `_syncOwnerDebts(a)` (diedit) — `nonSelfOwners` sekarang juga exclude
  owner berstatus `'milik'` (`Aset.getOwnerSettlement(a,o.ownerId)!=='milik'`)
  — owner 'milik' TIDAK lagi punya/mempertahankan entry Buku Utang, porsi
  kepemilikan (`a.owners[]`) 0 disentuh.

**0 UI/filter sesi ini** (fondasi saja, pola sama S660) — dropdown di modal
Owners Aset & filter list Buku Aset jadi sesi lanjutan (pola S661/S662 tapi
utk Aset).

## Verifikasi

- `node -c modules/asset/aset-owners.js` — lolos.
- Test baru: `tests/s665-aset-owner-settlement-bukan-titipan.test.js` (6 test:
  default 'titipan' 0 regresi; setOwnerSettlement 'milik' hapus debt tanpa
  ubah porsi; balik ke 'titipan' munculkan debt lagi; assetsByOwnerSettlement
  filter benar; throw assetId tidak ditemukan; throw ownerId kosong).
- Full suite: **4960/4960 pass** (4954 sebelumnya + 6 baru, 0 regresi).
- Release Gate: lolos (lint/minify di-override, sandbox tanpa jaringan).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test |
| `SESSION-NOTE-S661.md` | S661 | catatan |
| `modules/asset/investasi-list-view.js` | S662, S663, S664 | filter owner+status, baris info ringkasan, badge jumlah |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 (assertion diupdate S664) | test |
| `SESSION-NOTE-S662.md` | S662 | catatan |
| `tests/s663-investmentlistui-summary-filter-note.test.js` | S663 | test |
| `SESSION-NOTE-S663.md` | S663 | catatan |
| `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js` | S664 | test |
| `SESSION-NOTE-S664.md` | S664 | catatan |
| `modules/asset/aset-owners.js` | S665 | owner settlement foundation (Aset) |
| `tests/s665-aset-owner-settlement-bukan-titipan.test.js` | S665 | test baru |
| `SESSION-NOTE-S665.md` | S665 | catatan sesi ini |

## Belum dikerjakan

- UI toggle "Titipan/Milik" di modal Owners Aset + filter list Buku Aset
  (pola S661/S662, tapi domain Aset) — sesi lanjutan.
- Filter nyambung ke Dana Titipan tab (Investasi, S540/`DanaTitipanPortfolioPresenter`).
- Multi-select owner (Investasi).
