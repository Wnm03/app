# S1830 — FINAL Scan / Import / Export / Restore Integrity Audit

## Tujuan
Menutup audit domain Scan/OCR, CSV/JSON import, export, backup/restore, dan round-trip identity dalam satu tahap kumulatif setelah S1827–S1829.

## Chain yang diaudit
`Scan/OCR -> Preview -> Commit -> Export -> Import -> Restore -> Reconciliation -> Orphan/Identity`.

## Hasil

### PASS / sudah hardened
- Universal Scan tetap memakai preview/validasi dan target akun eksplisit; tidak membuat akun berdasarkan nama OCR secara membabi-buta.
- CSV laporan memakai escaping CSV sehingga koma/kutip/newline pada cell tidak menggeser kolom.
- Car Notes CSV memakai record parser yang menghormati quoted newline.
- Import transaksi CSV/JSON mempunyai idempotency key sehingga import file yang sama tidak menggandakan record yang sudah dikenali.
- Car Notes JSON mempertahankan `bbmLogs[].id` dan `vehicleId`; repeated import tidak menggandakan record ber-ID.
- Service import/restore mempertahankan `id`, `vehicleId`, snapshot next-due, dan validasi odometer.
- Restore memiliki schema/shape gate sebelum merge dan compensating rollback untuk auxiliary IndexedDB.
- Vehicle catalog import tetap melewati `VehicleCatalogWriteSOT`.
- OCR/Honda PDF flow tetap preview -> commit; parser tidak menjadi jalur persistence langsung.

### FIX S1830 — Shop JSON identity
Sebelumnya Shop JSON export membawa `products`/`produsen` beserta ID, tetapi mode `gabung` membuat produk baru dengan ID baru dan mencari existing terutama berdasarkan nama. Karena `productId` dipakai oleh Kasir/Finance, pola tersebut dapat memutus identity pada round-trip.

Perubahan:
1. Import Shop JSON sekarang mencari `product.id` terlebih dahulu.
2. Jika source ID sudah ada, record tersebut yang di-update.
3. Jika source ID belum ada, ID source dipertahankan saat membuat produk baru.
4. Jika source memiliki ID tetapi nama yang sama sudah dimiliki record dengan ID berbeda, import tidak menebak/merge; row dilewati agar tidak menciptakan identity collision.
5. Supplier/produsen memakai aturan identity-first yang sama.
6. Export Shop JSON tetap membawa stable ID.

## Non-goals
- Tidak melakukan fuzzy merge.
- Tidak mengganti ID legacy secara massal.
- Tidak mengubah Shop JSON menjadi full backup seluruh ledger Shop; backup aplikasi tetap menjadi jalur full-domain.
- Tidak menginfer `catalogId`, `serviceComponentId`, atau `vehicleId` dari kemiripan nama.

## Regression
Focused combined gate: **17/17 PASS**.

Full `npm test` pada worktree ini tidak selesai dalam batas eksekusi 5 menit, sehingga tidak diklaim sebagai full-suite PASS. Ini bukan indikasi failure test tertentu; proses hanya belum selesai dalam timeout.

## Status sesi
S1830 diperlakukan sebagai tahap penutupan audit Scan/Import/Export/Restore. Setelah patch ini, pekerjaan berikutnya sebaiknya berupa release validation/rebuild bundle, bukan membuat rangkaian audit baru untuk domain yang sama.
