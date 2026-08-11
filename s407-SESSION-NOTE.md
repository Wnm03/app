# Sesi 407 (Sesi A dari 4) — MultiOwnerEngine.getOwners(): sintesis dari `titipanAmount` legacy

## Konteks

Rencana migrasi Dana Titipan (field `a.titipanAmount` di `modules/asset/aset.js`,
model porsi tunggal + 1 utang sinkron) ke Multi-Owner Engine (`modules/shared/
multi-owner-engine.js`, Sesi 390) dipecah 4 sesi (disiplin 1 task = 1 sesi):

1. **Sesi A (sesi ini)** — `getOwners()`: tambah cabang sintesis dari
   `titipanAmount` legacy. Pure, 0 UI, 0 `D.debts`.
2. Sesi B — `_syncOwnerDebts()` gantiin `_syncTitipanDebt()`.
3. Sesi C — `Aset.save()` + `saveOwners()`: wiring auto-migrate.
4. Sesi D — `dana-kelolaan.js`: `sumTitipanAset()` baca dari `MultiOwnerEngine`.

## Perubahan

- `modules/shared/multi-owner-engine.js`:
  - `getOwners()` — cabang baru dicek SEBELUM cabang `ownership` legacy
    (titipan kasih info split parsial lebih rinci): kalau entity punya
    `titipanAmount>0` & `nilai>0` (angka valid), disintesis jadi:
    - 2 pemilik — `SELF` (porsi = sisa `nilai-titipanAmount`) + pemilik
      titipan (`ownerId: 'titipan_'+titipanOwnerType`, `ownerName` mengikuti
      format label yang SAMA PERSIS dgn `Aset._syncTitipanDebt()` — "Nama
      (Investor/Keluarga/Pihak Lain)" atau label tipe polos kalau nama
      kosong), ATAU
    - 1 pemilik (titipan) kalau `titipanAmount>=nilai` (titipan penuh, porsi
      sendiri habis).
  - `_synthesizeFromTitipan(entity)` (helper internal baru) — nominal
    titipan dijepit ke `[0, nilai]` (pola clamp sama dgn `Aset.save()`),
    `selfPorsi` dihitung sbg SISA `100-titipanPorsi` (bukan dibagi terpisah)
    supaya total porsi selalu PERSIS 100, tidak ada residu float.
  - `fundSource`/`titipanOwner` (all-or-nothing) di `modules/asset/
    investasi.js` SENGAJA TIDAK ikut disintesis di sini — beda model dari
    `titipanAmount` parsial-nya `aset.js`; holding investasi tetap balik ke
    sintesis default (100% SELF atau via `ownership`) sampai ada sesi
    terpisah yang eksplisit memutuskan itu.
  - Tidak ada perubahan ke `entity.owners`/`D.debts`/`_syncTitipanDebt()` —
    murni cara BACA data lama, tidak ada tulis/migrasi.
- `tests/multi-owner-engine.test.js` — 8 test baru: split parsial (total
  100), fallback nama tanpa `titipanOwnerName`, label tipe
  investor/keluarga/lainnya/default, titipan penuh (1 pemilik), nominal
  korup dijepit, `titipanAmount<=0`/`nilai` invalid tidak disintesis (lanjut
  cabang lain), prioritas `entity.owners` tetap menang, hasil salinan aman
  dimutasi.

## Verifikasi

- `node --test tests/*.test.js` → **2729/2729 pass** (2721 lama + 8 baru), 0 fail.
- `node scripts/build.js` → build sukses, sintaks bundle valid, versi
  `v1112` → `v1113`.
- `npm run lint` (eslint) **belum sempat dijalankan** — environment ini
  tidak ada akses internet buat `npm install`. Kode baru mengikuti gaya
  file sekitarnya (indentasi 2-spasi dalam objek literal, titik koma, kutip
  tunggal) — kemungkinan besar aman, tapi belum diverifikasi otomatis.

## Lanjut ke Sesi B

`_syncOwnerDebts()` gantiin `_syncTitipanDebt()`: multi-debt per owner via
`linkedOwnerId`, auto-hapus saat owner dicabut. Belum dikerjakan sesi ini.
