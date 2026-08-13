# Patch Gabungan — S599 (Ghost Asset di Asset Picker) + Ownership Fix (Hapus Porsi Titipan)

Gabungan 2 patch independen, TIDAK ada file yang saling tumpang tindih
antara keduanya, jadi digabung apa adanya tanpa perlu resolve konflik.
Struktur folder SAMA seperti project asli — tinggal timpa.

Total 3 file berubah/baru dibanding baseline:
- `modules/finance/dana-titipan-portfolio-render.js` (diubah — dari patch S599)
- `tests/dana-titipan-asset-picker-ghost-asset-s599.test.js` (baru — dari patch S599)
- `modules/asset/aset.js` (diubah — dari patch Ownership Fix)

## Cara pakai
1. Backup project Anda.
2. Timpa/tambahkan ketiga file di atas (path sama persis dengan struktur zip ini).
3. Rebuild bundle: `node scripts/build.js` (atau `npm run build`).
4. Reload aplikasi (hard refresh).

## Ringkasan isi patch 1: S599 — Ghost Asset di Dropdown Pilih Aset

Root cause: `DanaTitipanPortfolioPresenter._assetOptionsHtml()` adalah
satu-satunya titik baca `D.assets` di modul Dana Titipan yang tidak
menerapkan guard `_migratedToInvestmentId` / `investmentId`, sehingga
aset yang sudah termigrasi/tertaut ke Holding Investasi tetap muncul
sebagai opsi di picker "Pilih Aset" walau sudah hilang dari Buku Aset.

Fix: tambah filter `!a._migratedToInvestmentId && !a.investmentId` di
`_assetOptionsHtml()`, pola sama persis `Aset.totalValue()`.

Verifikasi asal: 4176/4176 test pass.

## Ringkasan isi patch 2: Ownership Fix — Porsi Titipan Tidak Bisa Dihapus & Disimpan

Dua perubahan di `aset.js` (fungsi owners-draft, modal Atur Kepemilikan Aset):

1. `removeOwnerRow(i)` — porsi baris owner yang dihapus sekarang
   didistribusi ulang ke baris tersisa (presisi 4 desimal), supaya
   total tetap 100% dan tombol "✅ Simpan Porsi" tidak macet ter-disable.
2. `saveOwners()` — field titipan legacy (`titipanAmount` /
   `titipanOwnerType` / `titipanOwnerName`) ikut dikosongkan begitu
   user simpan `owners[]` eksplisit lewat modal ini, konsisten dengan
   blok AUTO-MIGRATE di `Aset._saveInner()`.

Verifikasi asal: 4173/4173 test pass.

## Catatan penggabungan
- Tidak ada overlap file antara kedua patch → digabung tanpa perlu
  merge manual per baris kode.
- Setelah ditimpa, disarankan jalankan ulang full suite:
  `node --test tests/*.test.js` untuk memastikan kombinasi keduanya
  tetap 0 regresi (masing-masing sudah diverifikasi terpisah, tapi
  belum pernah dijalankan bersamaan di baseline yang sama).
- Belum ada entri `CHANGELOG.md` / bump versi `sw.js` untuk salah satu
  fix ini (sama seperti catatan di patch Ownership Fix asli). Kalau mau
  saya tambahkan, bilang saja.
