# S2381 — Cache kategori pada preflight servis batch

## Temuan
`Servis.markServicedBatch(items)` sebelumnya menjalankan `D.sparepartCats.find(...)` untuk setiap item sebelum mengumpulkan snapshot stok rollback. Batch dengan banyak item pada kategori yang sama mengulang pemindaian katalog kategori.

## Perbaikan
- Tambahkan `Map` lokal untuk menyimpan hasil resolusi kategori per `catId`, termasuk hasil tidak ditemukan.
- Pertahankan `===` untuk pencocokan ID dan `Array.find` untuk memilih kecocokan pertama ketika ID duplikat.
- Batasi katalog ke array yang valid; jika katalog bukan array, perilaku preflight menjadi katalog kosong (tidak ada kategori ditemukan).
- Pemilihan stok tetap memakai `Servis._findAutoGantiStock` sehingga aturan kelayakan kendaraan dan keunikan kandidat tidak diubah.

## Batasan dan verifikasi
Optimasi ini mengurangi scan katalog kategori, bukan scan `D.partsStock` di `_findAutoGantiStock`. Jalur stok sengaja tidak diubah karena predicate `Sparepart.isPartForVehicle` dan aturan kandidat tunggal memerlukan audit tersendiri.
