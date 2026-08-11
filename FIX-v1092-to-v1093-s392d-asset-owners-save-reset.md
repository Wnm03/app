# Sesi 392d — Simpan/Reset Porsi Kepemilikan (langkah 4 dari 5)

## Instruksi user

Lanjutan rencana kerja bertahap "form UI porsi kepemilikan" (5 sesi, dari FIX-s392a).
User minta lanjut sesi berikutnya: 392d — `saveOwners()`/`resetOwners()`, validasi &
tulis ke `D.assets`.

## Konteks sebelum implementasi

- Sesi 392a (v1090): skeleton modal read-only.
- Sesi 392b (v1091): draft baris pemilik interaktif di memori (`Aset._ownersDraft`).
- Sesi 392c (v1092): `updateOwnersTotal()`, indikator total % realtime (hijau/merah).
- Sampai akhir 392c, `Aset._ownersDraft` masih **belum pernah ditulis** ke `D.assets`
  — tombol Simpan belum ada, tutup modal = perubahan hilang.

## Yang dikerjakan sesi ini (392d)

1. **`modules/asset/aset.js`**
   - `Aset.saveOwners()` (baru) — baca `Aset._ownersDraft`, validasi:
     - Aset harus sudah tersimpan (`Aset._ownersModalAsset` ada).
     - Minimal 1 baris pemilik.
     - Tiap baris wajib punya nama (dicek di sesi ini, di luar
       `MultiOwnerEngine.validateOwner()` yang tidak mewajibkan `ownerName`).
     - Baris baru (dari `addOwnerRow()`, `ownerId` masih kosong) diberi id via
       `uid()` (helper global yang sudah dipakai di seluruh `aset.js`) sebelum
       divalidasi; baris lama (dari data tersimpan) tetap pakai `ownerId` aslinya.
     - Validasi & normalisasi akhir 100% reuse `MultiOwnerEngine.setOwners()` (S390,
       di dalamnya `validateOwners()` — cek total 100%, tidak ada `ownerId` duplikat,
       dst). **0 rumus validasi baru ditulis di sesi ini.**
     - Kalau valid: `Object.assign(a,{owners:res.entity.owners})` pada objek
       `D.assets` asli (dicari ulang via `sameId()`, pola sama persis
       `Aset.save()`), lalu `save()` (persist ke IndexedDB, reuse), emit
       `AIBus.emit("asset.updated",...)`, `Aset.renderList()`, toast sukses.
       Modal **TIDAK** ditutup otomatis (biar user bisa lanjut cek/ubah pemilik
       lain tanpa buka-tutup ulang) — draft disinkronkan ulang ke hasil tersimpan.
     - Kalau tidak valid: toast pesan alasan (dari `MultiOwnerEngine`/pengecekan
       nama), draft TIDAK hilang, modal tetap terbuka.
   - `Aset.resetOwners()` (baru) — buang perubahan draft yang belum disimpan,
     muat ulang `Aset._ownersDraft` dari data TERSIMPAN via
     `MultiOwnerEngine.getOwners()` — logic baca SAMA PERSIS dengan
     `openOwnersModal()` (0 logic baru), cuma dipanggil ulang tanpa perlu
     tutup/buka modal.
   - `updateOwnersTotal()` — ditambah 1 baris: tombol `#assetOwnersSaveBtn`
     otomatis `disabled` kalau total porsi BELUM pas 100% (sinkron dengan syarat
     `validateOwners()`), aktif kalau sudah pas. PURE UI, reuse
     total/sisa yang sudah dihitung sesi 392c, tidak ada kalkulasi baru.

2. **`modules/shared/modals.js`**
   - `assetOwnersModal`: tambah 2 tombol baru — `✅ Simpan Porsi`
     (`id="assetOwnersSaveBtn"`, `data-action="Aset.saveOwners"`) dan
     `↺ Reset Draft` (`data-action="Aset.resetOwners"`), diletakkan sebelum tombol
     `Tutup` yang sudah ada.
   - Hint text diupdate: menjelaskan tombol Simpan sekarang aktif (nonaktif
     otomatis kalau total belum 100%) dan Reset Draft membuang perubahan belum
     tersimpan — kalimat lama "tombol Simpan belum aktif" dihapus.
   - `MODAL_VERSION` -> `s392d-asset-owners-save-reset`.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- Tidak ada perubahan ke `MultiOwnerEngine` (S390) — semua validasi/normalisasi
  reuse apa adanya.
- Tidak ada split otomatis keuntungan berdasar porsi (`splitByPorsi()` sudah ada
  di engine sejak S390, tapi belum ada caller di UI) — itu scope terpisah,
  bukan bagian dari rencana 5-sesi "form UI porsi kepemilikan" ini.
- Sesi 392e (regression check menyeluruh setelah input beneran dipakai) — ditunda
  ke sesi berikutnya sesuai rencana.
- `scripts/build.js` tidak diubah (tidak ada file baru untuk diregistrasi).

## Regression & build

`npm test`: **2661/2661 pass** (tidak ada test unit baru — sesi ini murni wiring
UI ke `MultiOwnerEngine.setOwners()`/`getOwners()` yang sudah punya test suite
sendiri dari S390 dan tidak diubah; validasi nama-wajib-diisi di `saveOwners()`
adalah pengecekan UI sederhana, bukan logic domain baru yang butuh test terpisah).
`node scripts/build.js s392d-asset-owners-save-reset` — sukses, sintaks kedua
bundle valid. Versi v1092 → **v1093**.

## Status

Langkah 4 dari 5 rencana "form UI porsi kepemilikan" **SELESAI** (simpan/reset
porsi kepemilikan, benar-benar tertulis ke `D.assets`). Lanjutan (392e: regression
check menyeluruh setelah input beneran dipakai) siap dikerjakan sesi berikutnya
kapan saja diminta.
