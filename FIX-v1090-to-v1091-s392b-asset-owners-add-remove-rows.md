# Sesi 392b — Form Interaktif "Atur Porsi Kepemilikan" (langkah 2 dari 5)

## Instruksi user

Lanjutan rencana kerja bertahap dari FIX-s392a (form UI porsi kepemilikan
majemuk, dipecah 5 sesi dari yang paling ringan). User minta lanjut sesi
berikutnya: 392b — `addOwnerRow()`/`removeOwnerRow()`, baris input nama +
porsi interaktif.

## Konteks sebelum implementasi

- Sesi 392a (v1090) sudah bikin skeleton modal `assetOwnersModal` +
  `Aset.openOwnersModal()` — READ-ONLY, cuma render daftar pemilik lewat
  `MultiOwnerEngine.getOwners()` (S390), tidak ada state yang bisa diubah.
- `MultiOwnerEngine` (modules/shared/multi-owner-engine.js, S390) sudah
  punya semua primitif yang dibutuhkan (`validateOwner`, `validateOwners`,
  `totalPorsi`, `remainingPorsi`, `setOwners`) — sesi ini TIDAK menambah
  logic baru ke engine, cuma dipakai lewat `getOwners()` (sama seperti
  392a) untuk isi draft awal.

## Yang dikerjakan sesi ini (392b)

1. **`modules/asset/aset.js`**
   - `Aset.openOwnersModal()` diubah: sekarang menyalin hasil
     `MultiOwnerEngine.getOwners(a).owners` ke `Aset._ownersDraft` (array
     di memori, BUKAN referensi ke `D.assets` — aman diubah tanpa
     menyentuh data asli) dan `Aset._ownersModalAsset` (aset yang lagi
     dibuka), lalu panggil `Aset._renderOwnersList()` untuk render.
   - `Aset._renderOwnersList()` (baru, helper privat) — render ulang
     `#assetOwnersList` dari `Aset._ownersDraft`: tiap baris jadi 2 input
     (nama pemilik + porsi %) + tombol hapus (✕). Kalau draft kosong,
     tampil pesan "Belum ada pemilik". Kalau aset belum tersimpan, tampil
     pesan "simpan dulu" (sama seperti 392a).
   - `Aset.addOwnerRow()` (baru) — tambah 1 baris kosong
     (`{ownerId:'',ownerName:'',porsi:0}`) ke `_ownersDraft`, render
     ulang. Kalau aset belum tersimpan, tolak lewat toast (tidak bisa
     tambah baris).
   - `Aset.removeOwnerRow(i)` (baru) — hapus baris index `i` dari
     `_ownersDraft`, render ulang. Boleh mengosongkan semua baris (guard
     minimal 1 pemilik ditunda ke validasi 392d/`saveOwners()`).
   - `Aset.onOwnerNameInput(i,val)` / `Aset.onOwnerPorsiInput(i,val)`
     (baru) — tulis ketikan user ke `_ownersDraft[i]` TANPA render ulang
     list (supaya fokus/kursor input tidak hilang tiap karakter diketik;
     render ulang cuma perlu saat baris ditambah/dihapus).
   - Semua method di atas PURE UI + state draft di memori — TIDAK ada
     yang menulis ke `D.assets` sesi ini (sama disiplin dgn 392a).

2. **`modules/shared/modals.js`**
   - Modal `assetOwnersModal`: hint text diupdate (dari "baca saja" jadi
     menjelaskan tambah/hapus/edit baris sudah bisa, tapi validasi total
     & tombol Simpan belum aktif — perubahan belum tersimpan kalau modal
     ditutup).
   - Tombol baru `➕ Tambah Pemilik` (`data-action="Aset.addOwnerRow"`)
     ditambahkan tepat di bawah `#assetOwnersList`.
   - `MODAL_VERSION` -> `s392b-asset-owners-add-remove-rows`.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- `updateOwnersTotal()` (indikator total porsi realtime warna
  hijau/merah) — ditunda ke Sesi 392c. `#assetOwnersTotalBox` sesi ini
  masih menampilkan status awal saat modal dibuka (statis), belum
  ter-update tiap baris ditambah/dihapus/diedit.
- `saveOwners()`/`resetOwners()` — ditunda ke Sesi 392d. Perubahan di
  `Aset._ownersDraft` sesi ini **belum tersimpan** ke `D.assets` — kalau
  modal ditutup tanpa tombol Simpan (yang memang belum ada), perubahan
  hilang (sesuai desain: draft murni di memori sampai 392d selesai).
- Tidak ada perubahan skema data (`entity.owners`) atau logic
  `MultiOwnerEngine`/`asset-ownership-split-presenter.js`/rule AI S391.
- `scripts/build.js` tidak diubah (tidak ada file baru yang perlu
  diregistrasi — sesi ini murni edit 2 file source yang sudah ada, sama
  seperti 392a).

## Regression & build

`npm test`: **2661/2661 pass** (tidak ada test unit baru — sesi ini
murni UI/state-draft di memori tanpa rumus/kalkulasi baru untuk diuji;
`MultiOwnerEngine` yang dipakai sudah punya test suite sendiri dari S390
dan tidak diubah).
`node scripts/build.js s392b-asset-owners-add-remove-rows` — sukses,
sintaks kedua bundle valid. Versi v1090 → **v1091**.

## Status

Langkah 2 dari 5 rencana "form UI porsi kepemilikan" **SELESAI** (tambah/
hapus/edit baris pemilik, draft di memori). Lanjutan (392c: indikator
total realtime, 392d: simpan/reset, 392e: regression check menyeluruh)
siap dikerjakan sesi berikutnya kapan saja diminta.
