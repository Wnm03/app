# Sesi 410 (Sesi C dari 4, TERAKHIR) — `Aset.save()`/UI: auto-migrate Dana Titipan -> Multi-Owner Engine

## Konteks

Sesi terakhir dari 4 sesi migrasi Dana Titipan -> Multi-Owner Engine (lihat
`s406b-SESSION-NOTE.md`/Sesi A, `s407-SESSION-NOTE.md`/Sesi A susulan,
`s408-SESSION-NOTE.md`/Sesi B, `s409-SESSION-NOTE.md`/Sesi D — Sesi D
dikerjakan lebih dulu krn lebih ringan). Sesi ini: Sesi C —
`Aset.save()`/`saveOwners()` wiring auto-migrate BENERAN (nulis `a.owners`
dari `titipanAmount` via `MultiOwnerEngine.setOwners()`) saat titik simpan,
hapus toggle & field titipan dari `assetModal`, ganti jadi ringkasan
read-only.

## Perubahan

- `modules/asset/aset.js`:
  - `openModal()` — blok isi ulang toggle+field Dana Titipan (checkbox
    `assetTitipanToggle`, select `assetTitipanOwnerType`, input
    `assetTitipanOwnerName`/`assetTitipanAmount`) DIHAPUS, diganti 1 baris
    panggilan `Aset._renderTitipanSummary(a)`.
  - `toggleTitipan()`, `TITIPAN_OWNER_LABELS`, `onTitipanOwnerTypeChange()`
    DIHAPUS (fungsi UI utk field yang sudah tidak ada).
  - `_renderTitipanSummary(a)` (BARU) — PURE read-only, baca pemilik
    non-SELF aset SAAT INI lewat `MultiOwnerEngine.getOwners(a)` (toleran
    data lama/baru, 0 rumus baru), tampil di `#assetTitipanSummary` kalau
    ada (mis. "💰 Ada dana titipan/patungan: Pak Budi (Investor) 40% —
    atur lewat tombol..."), kosong+hidden kalau aset 100% SELF/single-
    owner. Mengarahkan user ke tombol "⚖️ Atur Porsi Kepemilikan"
    (`openOwnersModal()`, sudah ada sejak S392a) sbg SATU-SATUNYA pintu
    mengatur porsi kepemilikan/titipan — sebelumnya ada 2 jalur terpisah
    (toggle titipan cepat vs modal porsi majemuk) yang bisa saling
    divergen.
  - `save()`:
    - `ownPortion` (dipakai sinkron nominal akun tertaut) — SEBELUM sesi
      ini dihitung dari toggle+nominal titipan manual di form. Sekarang
      dihitung dari porsi SELF EFEKTIF aset yang SUDAH TERSIMPAN (kalau
      Edit Aset) lewat `MultiOwnerEngine.selfOwnedValue(existingAsset,
      nilaiBaru)` (100% reuse S390/393, 0 rumus baru), diterapkan ke nilai
      yang baru diketik di form. Aset BARU (belum py owners tersimpan)
      selalu 100% SELF di titik simpan pertama — porsi majemuk diatur
      SETELAHNYA lewat "⚖️ Atur Porsi Kepemilikan" (pola sama sejak
      S392a).
    - `extra.titipanAmount`/`titipanOwnerType`/`titipanOwnerName` TIDAK
      lagi diisi ulang dari form (field sudah tidak ada di UI) —
      `Object.assign()` cuma menimpa key yang ADA di `extra`, jadi nilai
      lama (aset yang belum sempat auto-migrate) TIDAK ikut ke-reset ke 0
      tiap kali aset itu disimpan; tetap utuh sampai blok AUTO-MIGRATE di
      bawah memindahkannya.
    - AUTO-MIGRATE (BARU, inti sesi ini) — persis SEBELUM
      `Aset._syncOwnerDebts(savedAsset)`: kalau aset masih py
      `titipanAmount>0` legacy TAPI BELUM py `owners` array eksplisit,
      dipanggil `MultiOwnerEngine.getOwners(savedAsset)` (mensintesis 2
      baris SELF+titipan dari `nilai`/`titipanAmount`/`titipanOwnerType`/
      `titipanOwnerName`, cabang Sesi 406b) lalu `setOwners()` (S390) buat
      benar-benar MENULIS hasil sintesis itu ke `savedAsset.owners`. Field
      titipan legacy dikosongkan (`titipanAmount:0`, dst) SETELAH migrasi
      sukses — representasinya sudah pindah penuh ke `owners`
      (`getOwners()` prioritas baca #1 ada di `entity.owners`, jadi field
      lama TIDAK dibaca lagi setelah ini). 100% reuse
      `getOwners()`+`setOwners()`, 0 rumus baru ditulis di sini.
- `modules/shared/modals.js` (template `assetModal`):
  - Blok toggle "💰 Ada Dana Titipan?" (`assetTitipanToggle`) + wrap field
    (`assetTitipanWrap`: `assetTitipanOwnerType`, `assetTitipanOwnerName`,
    `assetTitipanAmount`) DIHAPUS SELURUHNYA.
  - Diganti 1 `<div id="assetTitipanSummary" class="u-dnone">` kosong
    (diisi JS lewat `_renderTitipanSummary()`), diletakkan tepat sebelum
    tombol "⚖️ Atur Porsi Kepemilikan" yang sudah ada.

## Kenapa ini "penyelesaian" migrasi, bukan cuma refactor UI

`titipanAmount` cuma bisa merepresentasikan 1 pemilik titipan per aset,
dan sebelum sesi ini nilainya HANYA disintesis on-the-fly tiap dibaca
(tidak pernah benar-benar ditulis ke `a.owners`) — jadi aset yang porsi
titipannya diisi lewat toggle cepat itu tetap "buta" dari perkakas
majemuk (mis. tidak bisa ditambah owner ke-2/ke-3 tanpa lewat modal porsi
kepemilikan). Sesi ini menyatukan 2 jalur input jadi 1 (modal "⚖️ Atur
Porsi Kepemilikan"), dan menulis PERMANEN hasil sintesis titipan lama ke
`a.owners` begitu aset itu disimpan ulang — sehingga migrasi Dana Titipan
-> Multi-Owner Engine (S406b -> S407 -> S408 -> S409 -> S410 ini) benar-
benar TUNTAS: tidak ada lagi jalur baca/tulis ganda utk data kepemilikan
aset.

0 REGRESI: aset lama yang BELUM sempat disimpan ulang lewat sesi ini tetap
terbaca benar di semua tempat yang sudah pakai `MultiOwnerEngine.getOwners()`
(Dana Kelolaan/S409, `_syncOwnerDebts()`/S408, Zakat Maal/S393, dst) — cabang
sintesis `_synthesizeFromTitipan()` (S406b) tidak diubah/dihapus sesi ini,
cuma sekarang punya jalur "penulisan permanen" tambahan lewat `save()`.

## Verifikasi

- `node --test tests/*.test.js` → **2732/2732 pass**, 0 fail (test suite
  tidak berubah sesi ini — tidak ada test lama yang menguji UI toggle
  titipan/`Aset.save()` end-to-end lewat DOM, jadi tidak ada test yang
  perlu diupdate; regresi `[gap-check]` HTML `assetModal` di
  `tests/asset-owners-flow-e2e-392a-to-392e.test.js` — yang mengecek
  keseimbangan tag & tombol `Aset.openOwnersModal` tidak nyempil di
  atribut lain — tetap hijau, sempat gagal 1x saat editing HTML lalu
  langsung diperbaiki sebelum commit).
- `node scripts/build.js` → build sukses, sintaks kedua bundle valid,
  versi `v1115` → `v1116`.
- `npm run lint` (eslint) belum sempat dijalankan (tidak ada akses
  internet di environment ini) — kode baru mengikuti gaya file sekitarnya.

## Migrasi Dana Titipan -> Multi-Owner Engine: TUNTAS (4/4 sesi)

S406b/S407 (Sesi A: fondasi baca toleran) -> S408 (Sesi B: `_syncOwnerDebts()`
per-owner) -> S409 (Sesi D: `sumTitipanAset()` baca `MultiOwnerEngine`) ->
S410 (Sesi C, sesi ini: UI + auto-migrate tulis permanen). Tidak ada
kelanjutan yang tertunda dari rencana 4 sesi ini.
