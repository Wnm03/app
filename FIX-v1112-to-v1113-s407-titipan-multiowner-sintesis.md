# FIX v1112 -> v1113 — Sesi 407 (Sesi A/4): MultiOwnerEngine.getOwners() baca titipanAmount legacy

Lihat `s407-SESSION-NOTE.md` untuk detail lengkap & rencana 4 sesi.
Ringkas: `getOwners()` (`modules/shared/multi-owner-engine.js`) sekarang
punya 1 cabang sintesis baru — entity yg punya `titipanAmount` legacy
(`modules/asset/aset.js`: `nilai`, `titipanAmount`, `titipanOwnerType`,
`titipanOwnerName`) dibaca sbg 2 baris pemilik (SELF + pemilik titipan),
TANPA menyentuh data tersimpan/D.debts sama sekali — murni cara baca.

## Cara pasang

Timpa file-file berikut ke lokasi yang sama persis di project:

```
modules/shared/multi-owner-engine.js
tests/multi-owner-engine.test.js       (test baru, 8 test)
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
CHANGELOG.md
```

## Test

`node --test tests/*.test.js` → **2729/2729 pass, 0 fail**
(2721 sebelumnya + 8 baru khusus cabang titipan di `multi-owner-engine.test.js`).

## Lanjut

Sesi B (belum dikerjakan): `_syncOwnerDebts()` gantiin `_syncTitipanDebt()`
— multi-debt per owner via `linkedOwnerId`, auto-hapus saat owner dicabut.
