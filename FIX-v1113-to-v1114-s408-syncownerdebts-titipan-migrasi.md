# FIX v1113 -> v1114 — Sesi 408 (Sesi B/4): `_syncOwnerDebts()` gantiin `_syncTitipanDebt()`

Lihat `s408-SESSION-NOTE.md` untuk detail lengkap. Ringkas: `modules/asset/
aset.js` — `Aset._syncTitipanDebt(a)` diganti `Aset._syncOwnerDebts(a)`,
dibangun di atas `MultiOwnerEngine.getOwners()` (Sesi 407) supaya 1 entry
Buku Utang dibuat PER OWNER non-SELF (bukan 1 slot titipan tunggal), + auto-
hapus saat owner dicabut, + migrasi 1x dari `a.titipanDebtLinkId` lama.

## Cara pasang

Timpa file-file berikut ke lokasi yang sama persis di project:

```
modules/asset/aset.js
tests/asset-titipan.test.js                       (ditulis ulang)
tests/asset-owners-flow-e2e-392a-to-392e.test.js   (1 baris disesuaikan)
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

`node --test tests/*.test.js` → **2731/2731 pass, 0 fail**.

## Lanjut

Sesi C (belum dikerjakan): `Aset.save()` + `saveOwners()` — wiring
auto-migrate BENERAN (nulis `a.owners` via `MultiOwnerEngine.setOwners()`)
saat titik simpan, hapus toggle & field titipan dari `assetModal`, ganti
jadi ringkasan read-only.
