# S2382 — Cache kandidat stok otomatis pada preflight batch

## Temuan
`Servis.markServicedBatch(items)` sudah meng-cache resolusi kategori sejak S2381, tetapi untuk setiap item berkategori valid masih memanggil `Servis._findAutoGantiStock()`. Fungsi tersebut memfilter seluruh `D.partsStock`, sehingga item batch yang memakai kategori sama memindai stok berulang kali.

## Perbaikan
- Tambahkan `Map` lokal `_batchAutoStockByCatId` di preflight batch.
- Resolusi kandidat stok dijalankan sekali per ID kategori unik, termasuk menyimpan hasil `null` ketika tidak ada tepat satu kandidat.
- Tetap memakai `_findAutoGantiStock()` sebagai sumber aturan kelayakan kendaraan dan jumlah kandidat; tidak mengubah predicate atau pemilihan stok.
- Snapshot stok rollback dan proses mutasi sesudah preflight tidak diubah.

## Batasan
Cache ini hanya hidup selama preflight sinkron satu batch, sebelum mutasi stok dimulai. Cache tidak dipakai pada `markServiced()` tunggal atau form pengingat, sehingga perubahan stok lintas operasi tidak terpengaruh.

## Pengujian
`tests/s2382-batch-stock-candidate-cache.test.js` memeriksa jalur cache di source dan semantik cache: ID ketat, kecocokan pertama, hasil `null`, serta satu resolusi per kategori unik.
