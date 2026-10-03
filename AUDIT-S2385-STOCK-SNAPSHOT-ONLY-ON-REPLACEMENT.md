# S2385 — Hindari snapshot stok untuk tindakan servis tanpa konsumsi stok

## Temuan
`markServiced()` menyiapkan kandidat dan snapshot stok otomatis sebelum mengetahui apakah tindakan akan mengonsumsi stok. Jalur batch juga menjalankan resolver kandidat dan mengumpulkan ID stok untuk semua item, termasuk `periksa` dan `bersih`. Namun pemotongan stok hanya terjadi pada tindakan `ganti`.

## Perubahan
- Resolver stok dan snapshot rollback pada `markServiced()` hanya disiapkan untuk `actionType === 'ganti'`.
- Preflight `markServicedBatch()` hanya menyelesaikan kandidat stok untuk item penggantian.
- Cache per kategori dan alur rollback stok untuk item `ganti` tetap dipertahankan.

## Batasan dan kesetaraan perilaku
Tindakan `periksa` dan `bersih` tidak memanggil konsumsi stok sehingga snapshot stok tidak diperlukan untuk rollback mereka. Tindakan `ganti` tetap memakai resolver lama, aturan kandidat tunggal, dan snapshot kuantitas yang sama. Tidak ada cache lintas operasi.

## Validasi
Diuji melalui tes sumber S2385 serta rangkaian tes performa kumulatif terkait. Full suite dan release gate perlu dijalankan terpisah sebelum rilis.
