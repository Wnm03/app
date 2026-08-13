# Patch: Ghost asset "Majoris" dobel + Aset investasi baru tidak sync ke Holding

## Bug 2: Aset investasi baru tidak muncul di tab Investasi

### Root cause
`migrateAssetInvestmentsToHoldings()` (s476a) hanya menganggap aset sebagai
kandidat migrasi kalau field opsional `Modal Investasi` ATAU
(`Harga Beli/Unit` + `Jumlah Unit`) di assetModal terisi (`buku>0`). Kedua
field itu memang ditandai "(opsional)" di form, jadi wajar kalau user cuma
memilih jenis "Saham"/"Reksadana"/dst dan mengisi "Estimasi Nilai Saat Ini"
saja tanpa menyentuh field opsional tsb. Akibatnya `buku` tetap `null`
selamanya, aset tidak pernah lolos filter kandidat, dan tidak pernah
bermigrasi ke Holding di tab Investasi -- aset itu diam saja di Buku Aset,
terlihat sama seperti aset non-investasi biasa, tanpa ada indikasi error.

### Fix
Di `migrateAssetInvestmentsToHoldings()`, kalau `buku` masih `null` TAPI
`a.jenis` termasuk kategori investasi yang dikenal (ada di
`ASSET_JENIS_TO_INVESTMENT_TYPE`: Kripto/Reksadana/Saham/Deposito-Investasi/
Emas) DAN `a.nilai>0`, fallback `buku=nilai` (avgPrice=currentPrice=nilai,
untung/rugi awal dianggap 0 -- user bisa koreksi lewat 💱 Riwayat Transaksi
atau edit manual di holding sesudahnya). Aset non-investasi (Tanah/Kendaraan/
Rumah/Lainnya, tidak ada di mapping) sama sekali tidak terpengaruh.

### File yang dipatch
- `modules/asset/aset-misc.js` (source)
- `app-bundle-a.min.js` (satu-satunya bundle yang memuat fungsi ini)

### Verifikasi
- 7 test lama di `tests/s476a-migrate-investasi-to-holdings.test.js` tetap
  lolos semua (0 regresi ke Net Worth/Zakat/idempotency).
- 12 test lama di `tests/s476a2-cagr-yield.test.js` tetap lolos semua.
- Sanity test tambahan: aset jenis Saham dgn hanya "Nilai" terisi sekarang
  ikut bermigrasi (avgPrice=currentPrice=nilai); aset jenis Tanah dgn hanya
  "Nilai" terisi TETAP TIDAK bermigrasi (bukan kategori investasi).

---

# Patch: Ghost asset "Majoris" dobel di dropdown Multi-Owner

## Root cause
`migrateAssetInvestmentsToHoldings()` (s476a) memindahkan aset lama berisi
data investasi ke Holding baru di tab Investasi, lalu menandai record aset
lama dengan `_migratedToInvestmentId` dan menyembunyikannya dari daftar Buku
Aset. Tapi `getMultiOwnerAssets()` di `modules/finance/piutang-utang.js`
tidak ikut menyaring flag ini, sehingga record ghost tsb tetap muncul di
dropdown "Kaitkan ke Aset Multi-Owner" (Piutang/Utang/Transaksi) berdampingan
dengan Holding barunya -> tampak dobel ("Majoris" x2).

## Fix
Tambah `if(a._migratedToInvestmentId)return false;` di awal filter
`getMultiOwnerAssets()`.

## File yang dipatch
- `modules/finance/piutang-utang.js` (source)
- `app-bundle-a.min.js` (bundle yang benar-benar dimuat index.html/app_production.html)

## Tidak dipatch (dan kenapa)
- `finance/piutang-utang.js` — salinan lama, tidak direferensikan oleh
  `<script>` manapun di index.html/app_production.html (dead file).
- `app-bundle-b.min.js` — tidak mengandung `getMultiOwnerAssets()`.

## Dampak
- Dropdown "Kaitkan ke Aset Multi-Owner" tidak lagi menampilkan record aset
  yang sudah bermigrasi ke Investasi.
- Tidak mengubah `totalValue()`/perhitungan zakat (sudah exclude
  `_migratedToInvestmentId` sebelumnya).
- Ghost record LAMA yang sudah kadung tersimpan tidak otomatis terhapus oleh
  patch ini (itu memang bukan bug tampilan, cuma record diam yang tidak
  pernah dibersihkan) — kalau mau benar-benar dibuang dari data, tetap
  pakai jalur Backup/Restore (export JSON -> hapus objek berflag
  `_migratedToInvestmentId` di array `assets` -> restore).
