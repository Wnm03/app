# Sesi 392c — Indikator Total Porsi Realtime "Atur Porsi Kepemilikan" (langkah 3 dari 5)

## Instruksi user

Lanjutan rencana kerja bertahap dari FIX-s392a (form UI porsi kepemilikan majemuk,
dipecah 5 sesi dari yang paling ringan). User minta lanjut sesi berikutnya: 392c —
`updateOwnersTotal()`, indikator total % realtime (hijau/merah) di modal
`assetOwnersModal`.

## Konteks sebelum implementasi

- Sesi 392a (v1090): skeleton modal read-only.
- Sesi 392b (v1091): `addOwnerRow()`/`removeOwnerRow()`/`onOwnerNameInput()`/
  `onOwnerPorsiInput()` — draft baris pemilik interaktif di memori
  (`Aset._ownersDraft`), belum ada validasi total.
- `MultiOwnerEngine` (S390) sudah punya `totalPorsi(owners)` &
  `remainingPorsi(owners)` siap pakai — sesi ini TIDAK menambah logic baru ke
  engine, cuma memanggilnya.

## Yang dikerjakan sesi ini (392c)

1. **`modules/asset/aset.js`**
   - `Aset.updateOwnersTotal()` (baru) — baca `Aset._ownersDraft`, hitung total
     porsi via `MultiOwnerEngine.totalPorsi()` & sisa via
     `MultiOwnerEngine.remainingPorsi()` (100% reuse S390, 0 rumus baru), lalu
     tulis ke `#assetOwnersTotalBox`: teks "✅ Total porsi: X% (pas 100%)" warna
     hijau (`var(--accent3)`) kalau `|sisa| <= 0.01` (toleransi float sama
     seperti `MultiOwnerEngine`), atau "⚠️ Total porsi: X% (kurang/lebih Y%)"
     warna merah (`var(--accent2)`) kalau belum pas. Draft kosong -> pesan
     "Belum ada pemilik ditambahkan." abu-abu. Aset belum tersimpan -> box
     dikosongkan. PURE UI (baca saja, tidak menulis ke `D`).
   - `_renderOwnersList()` sekarang memanggil `Aset.updateOwnersTotal()` di
     setiap cabang (kosong/belum tersimpan/ada draft) — otomatis ter-update
     tiap baris ditambah (`addOwnerRow`) atau dihapus (`removeOwnerRow`), dan
     saat modal pertama dibuka (`openOwnersModal` -> `_renderOwnersList`).
   - `onOwnerPorsiInput(i,val)` sekarang juga memanggil
     `Aset.updateOwnersTotal()` setelah menulis ke draft — supaya indikator
     ikut update REALTIME tiap karakter diketik, TANPA render ulang seluruh
     `#assetOwnersList` (disiplin sama persis 392b: render list cuma perlu
     saat baris ditambah/dihapus, bukan tiap ketik, biar fokus/kursor input
     tidak hilang — `updateOwnersTotal()` sendiri cuma menyentuh
     `#assetOwnersTotalBox`, elemen terpisah dari input, jadi aman dipanggil
     tiap ketik).
   - `openOwnersModal()`: baris `totalBox.textContent=...` (status statis
     tunggal/majemuk) yang lama DIHAPUS — sekarang murni mengandalkan
     `_renderOwnersList()` -> `updateOwnersTotal()` untuk mengisi
     `#assetOwnersTotalBox` (indikator total realtime menggantikan status
     statis lama, sesuai tujuan sesi ini).

2. **`modules/shared/modals.js`**
   - Hint text `assetOwnersModal` diupdate: menjelaskan total porsi sekarang
     otomatis update & berubah warna (hijau = pas 100%, merah = belum), tombol
     Simpan masih belum aktif (ditunda ke 392d).
   - `MODAL_VERSION` -> `s392c-asset-owners-total-indicator`.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- `saveOwners()`/`resetOwners()` — ditunda ke Sesi 392d. Perubahan di
  `Aset._ownersDraft` masih **belum tersimpan** ke `D.assets` walau indikator
  total sekarang sudah akurat — kalau modal ditutup tanpa tombol Simpan (belum
  ada), perubahan tetap hilang.
- Tidak ada perubahan skema data (`entity.owners`) atau logic
  `MultiOwnerEngine`/`asset-ownership-split-presenter.js`/rule AI S391.
- `scripts/build.js` tidak diubah (tidak ada file baru yang perlu
  diregistrasi — sesi ini murni edit 2 file source yang sudah ada, sama
  seperti 392a/392b).

## Regression & build

`npm test`: **2661/2661 pass** (tidak ada test unit baru — sesi ini murni UI
realtime tanpa rumus/kalkulasi baru untuk diuji; `MultiOwnerEngine.totalPorsi()`/
`remainingPorsi()` yang dipakai sudah punya test suite sendiri dari S390 dan
tidak diubah).
`node scripts/build.js s392c-asset-owners-total-indicator` — sukses, sintaks
kedua bundle valid. Versi v1091 → **v1092**.

## Status

Langkah 3 dari 5 rencana "form UI porsi kepemilikan" **SELESAI** (indikator
total porsi realtime hijau/merah). Lanjutan (392d: simpan/reset, 392e:
regression check menyeluruh) siap dikerjakan sesi berikutnya kapan saja
diminta.
