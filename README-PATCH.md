# Patch: Hasil Audit Fitur Shop

## Isi (3 file: 1 baru, 2 diubah)

1. **`scripts/remove-shop-dead-files.sh`** (BARU) — hapus 9 dead file
   (~957 KB, terverifikasi 0 referensi path-exact di `scripts/build.js`):
   - `modules/shop/modals.js`
   - `modules/shop/modules-render.js`
   - `modules/shop/modules-calc.js`
   - `modules/shop/multi-owner-engine.js`
   - `modules/shop/features-helpers-global-security.js`
   - `modules/modals.js`
   - `modules/modules-render.js`
   - `modules/modules-calc.js`
   - `finance/tx-cobek.js`

   ⚠️ `modules/shop/business-intelligence-presenter.js` SENGAJA **tidak**
   masuk daftar — awalnya saya kira dead juga, tapi ternyata di-lazy-load
   runtime lewat `_loadScriptOnce()` di `app_production.html`. Jangan hapus file itu.

2. **`data-health-check.js`** (DIUBAH) — tambah 3 cek baru yang belum ada sebelumnya:
   - **ID produk duplikat** di `D.products` (pola sama dgn cek ID transaksi duplikat).
   - **Produk tertaut ke Kategori Shop yang sudah dihapus** (`product.kategoriId` → `D.cobekKategori`).
   - **Produk tertaut ke Produsen/Supplier yang sudah dihapus** (`product.produsenId` → `D.produsen`).

   Ketiganya murni baca (0 auto-repair), pola identik dengan orphan-check aset/kendaraan yang sudah ada di file ini.

3. **`tests/s572-tx-acc-change-stale-state.test.js`** (DIUBAH) — 1 subtest
   lama secara eksplisit menguji ISI file dead `modules/shop/modals.js`
   (bukti "tidak disentuh"). Karena filenya sekarang dihapus, assertion itu
   dilepas; assertion utama (wiring LIVE `modules/shared/modals.js`) tetap
   utuh.

## Cara pasang

1. Copy `data-health-check.js` & `tests/s572-tx-acc-change-stale-state.test.js` (timpa yang lama).
2. Copy `scripts/remove-shop-dead-files.sh` ke folder `scripts/`.
3. Dari root project: `bash scripts/remove-shop-dead-files.sh`
4. Verifikasi: `npm test` lalu `node scripts/build.js`.

## Sudah diverifikasi di sandbox

- `npm test`: **4489 test, 0 gagal** (sebelum & sesudah patch, termasuk setelah tambahan 2 cek orphan kategori/produsen).
- `node scripts/build.js`: sukses, versi naik wajar (1364 → 1365), sintaks bundle valid.
