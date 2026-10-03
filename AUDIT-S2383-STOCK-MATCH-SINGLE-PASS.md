# S2383 — Single-pass pencocokan stok servis berdasarkan katalog/nama

## Temuan

`findMatchingStockByCatalogId()` dan `findMatchingStockByName()` sebelumnya membuat daftar kandidat dengan `filter()`, menyaring kendaraan dengan `filter()` kedua, lalu melakukan `find()` untuk preferensi kendaraan tepat. Ini membuat beberapa traversal dan array sementara untuk satu lookup.

## Perubahan

Kedua resolver kini melakukan satu traversal atas `D.partsStock`, menghitung jumlah kandidat dalam cakupan, menyimpan kandidat tunggal, dan mencatat kandidat pertama yang cocok persis dengan kendaraan. Kebijakan yang ada dipertahankan: satu kandidat scoped dikembalikan; lebih dari satu kandidat hanya menghasilkan pilihan jika ada kandidat kendaraan tepat; tanpa kecocokan atau kandidat ambigu tetap menghasilkan `null`. Aturan `Sparepart.isPartForVehicle`, fallback kendaraan, normalisasi nama/katalog, dan urutan kandidat tidak diubah.

## Validasi

- Uji source memastikan kedua resolver tidak lagi memakai rantai `.filter()`/`.find()`.
- Uji semantik membandingkan resolver single-pass dengan implementasi sebelumnya untuk beberapa kasus kendaraan, stok global, duplikasi, dan kandidat ambigu.
- Pengujian penuh dan release gate perlu dinilai terpisah; jangan menyimpulkan kelulusan rilis hanya dari pengujian terfokus.
