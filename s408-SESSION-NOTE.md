# Sesi 408 (Sesi B dari 4) — `_syncOwnerDebts()` gantiin `_syncTitipanDebt()`

## Konteks

Lanjutan migrasi Dana Titipan -> Multi-Owner Engine (lihat `s407-SESSION-NOTE.md`
utk Sesi A). Sesi ini: Sesi B — `modules/asset/aset.js`.

## Perubahan

- `modules/asset/aset.js`:
  - `Aset._syncTitipanDebt(a)` **diganti** jadi `Aset._syncOwnerDebts(a)` —
    dibangun DI ATAS `MultiOwnerEngine.getOwners(a)` (Sesi A) supaya 1 entry
    Buku Utang dibuat **per owner non-SELF**, bukan cuma 1 slot titipan
    tunggal spt sebelumnya. Tiap debt ditandai `linkedAssetId`/`linkedOwnerId`
    di object utangnya sendiri (bukan 1 pointer tunggal `a.titipanDebtLinkId`
    spt dulu — field itu cuma muat 1 id, tidak cukup utk banyak owner).
  - Owner yang dicabut (porsi jadi 0 / baris ownernya hilang dari
    `getOwners()`) -> entry utang tertautnya otomatis dihapus lewat filter
    `linkedAssetId+linkedOwnerId`, sama seperti perilaku toggle-mati versi
    lama.
  - **Migrasi 1x** dari `a.titipanDebtLinkId` lama: debt yg sama ditandai
    `linkedAssetId`/`linkedOwnerId` (owner id disintesis deterministik sama
    persis dgn `MultiOwnerEngine._synthesizeFromTitipan()`, jadi otomatis
    "ketemu" lagi tanpa entry duplikat), field lama di-null-kan. TIDAK ada
    entry baru dibuat/dihapus semata krn migrasi ini.
  - 1 call site di `save()` di-rename ikut (`Aset._syncTitipanDebt(savedAsset)`
    -> `Aset._syncOwnerDebts(savedAsset)`) — WAJIB, kalau tidak `save()`
    manggil fungsi yang sudah tidak ada. Ini rename mekanis saja, BUKAN
    "wiring auto-migrate" yang dimaksud Sesi C (itu soal nulis `a.owners`
    beneran + ubah UI `assetModal`, belum dikerjakan sesi ini).
  - `fundSource`/`titipanOwner` di `modules/asset/investasi.js`
    (`Investment._syncTitipanDebt()`) **TIDAK disentuh** — beda modul, beda
    model (all-or-nothing per holding), di luar scope 4 sesi ini.
- `tests/asset-titipan.test.js` — **ditulis ulang** (bukan ditunda ke Sesi D
  spt rencana awal): semua referensi `Aset._syncTitipanDebt`/`a.titipanDebtLinkId`
  diganti ke `Aset._syncOwnerDebts`/`linkedAssetId`+`linkedOwnerId`, + 2 test
  baru khusus jalur migrasi 1x. Alasan deviasi: fungsi yang langsung dites di
  file ini yang berubah nama/perilaku di Sesi B ini juga (beda dari
  `dana-kelolaan.test.js` yang nunggu Sesi D krn `sumTitipanAset()` belum
  disentuh sesi ini) — supaya suite tetap hijau di akhir SETIAP sesi, bukan
  cuma di akhir Sesi D.
- `tests/asset-owners-flow-e2e-392a-to-392e.test.js` — 1 baris disesuaikan
  (marker akhir potongan kode gap-check ikut nama fungsi baru).

## Verifikasi

- `node --test tests/*.test.js` → **2731/2731 pass**, 0 fail.
- `node scripts/build.js` → build sukses, sintaks bundle valid, versi
  `v1113` → `v1114`.
- `npm run lint` (eslint) belum sempat dijalankan (tidak ada akses internet
  di environment ini) — kode baru mengikuti gaya file sekitarnya.

## Lanjut ke Sesi C

`Aset.save()` + `saveOwners()`: wiring auto-migrate BENERAN (nulis
`a.owners` dari `titipanAmount` via `MultiOwnerEngine.setOwners()`) saat
titik simpan, hapus toggle & field titipan dari `assetModal`, ganti jadi
ringkasan read-only. Belum dikerjakan sesi ini.
