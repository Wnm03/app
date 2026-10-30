# FIX — Bug "orphan:2" di `TitipanReconcile.checkAll()`

**Laporan:** self-test menampilkan `sync.ok=false (missing:0 orphan:2 mismatch:0)`
tiap `TitipanReconcile.checkAll()` dijalankan. Diblokir sebelumnya (lihat
`FIX-sD-titipan-majoris-custodian-stale-render.md`, bagian "Di luar scope") —
butuh data JSON aktual untuk identifikasi 2 record spesifik. Data
(`backup-keluarga-W-2026-08-12.json`) sekarang tersedia.

## Root cause
`Aset.delete(id)` (`modules/asset/aset.js`) cuma membersihkan Buku Utang lewat
`a.titipanDebtLinkId` — pointer TUNGGAL peninggalan sistem *single-owner*
sebelum Sesi B/AUD-008. Field itu SELALU `null` untuk aset yang sudah pernah
lewat `_syncOwnerDebts()` (di-null-kan tiap sync, lihat komentar
`_syncOwnerDebts()`). Sejak Sesi B, tiap owner non-SELF sebuah aset punya
entry Buku Utang SENDIRI, ditandai `linkedAssetId`/`linkedOwnerId` di object
utangnya sendiri (bisa >1 entry per aset — 1 aset 2 owner titipan = 2 entry).
`Aset.delete()` tidak pernah diupdate mengikuti model ini — persis pola
"entry point lupa panggil sync" yang berulang kali dicatat di komentar
`titipan-reconcile.js` (kelas bug BUG-OWN-002), kali ini di jalur **hapus**,
bukan simpan.

Direproduksi dgn data aktual: hapus aset **"Majoris"** (2 owner non-SELF —
mas sihab 15.1219%, renov 84.8781%) lewat `Aset.delete()` versi lama
menyisakan 2 entry Buku Utang nyangkut (Rp1.699.999,46 & Rp9.541.970,54) —
`TitipanReconcile.checkAll()` mendeteksinya sbg `orphan:2`, PERSIS cocok
dgn laporan.

## Perubahan
- **`modules/asset/aset.js`** — `Aset.delete(id)`:
  - Tambah `D.debts=D.debts.filter(d=>!sameId(d.linkedAssetId,id))` SETELAH
    cleanup `titipanDebtLinkId` lama (tetap dipertahankan utuh untuk data
    lama yang belum termigrasi) — pola sama persis baris cleanup di
    `_syncOwnerDebts()` sendiri, 0 rumus baru, cuma menyamakan cakupan
    hapus dengan cakupan sync yang sudah ada.
  - Trigger `renderDebtList()` diperluas: sebelumnya cuma jalan kalau
    `hadTitipanDebt` (legacy pointer), sekarang juga jalan kalau aset yang
    dihapus punya `owners[]` (kasus multi-owner baru), supaya UI Buku
    Utang langsung ikut update tanpa perlu ganti tab.

## Kenapa tidak ada test otomatis baru
`Aset.delete()` bergantung ke `askConfirm()` (async/UI) + banyak fungsi
render DOM di file yang sama — pola sama persis alasan
`FIX-sD-titipan-majoris-custodian-stale-render.md` tidak menambah test utk
`renameCustodian()`/`deleteCustodian()` (loadSource.js eksplisit melarang
dipakai utk fungsi yang baca/tulis DOM berat). Diverifikasi via skrip
reproduksi standalone (murni logic filter, dijalankan terhadap data JSON
aktual pengguna): sebelum fix → `orphan:2` (2 key: `<majorisId>::<mas
sihab ownerId>`, `<majorisId>::<renov ownerId>`); sesudah fix →
`TitipanReconcile.checkAll().sync = {ok:true, missing:[], orphan:[],
mismatch:[]}`.

## Test
Full regression suite: `node --test tests/*.test.js` → **4146/4146 lolos,
0 gagal** (0 test lama berubah).
