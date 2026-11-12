# Akumulasi S2800 — S2799 + dropdown stok transaksi dikelompokkan

Basis: app-main_8 (v2795) + zip ini saja (memuat seluruh isi S2796–S2799; gantikan S2799). Build `--require-minify` -> versi 2800, cache `kw-cache-v2800`, bundle segar.

## Perubahan baru (opsi 1 audit dropdown)
- `modules/finance/tx-stok-sparepart.js` (`txStockOptionsHtml`): bila ada baris stok>0 DAN stok 0, dropdown `txStockItem` dibagi `<optgroup>` "Stok tersedia" (atas) dan "Katalog (stok 0)" (bawah). Baris stok 0 tetap bisa dipilih (alur beli part). Hanya satu jenis -> tanpa grup (perilaku lama). Jumlah dan data baris tidak berubah.
- `modules/vehicle/part-crud-s2041.js` (`refreshSelect`): pengelompokan sama untuk PartPicker; pembanding no-op membuang tag optgroup (cegah loop mutasi S2041.2).
- `tests/s2800-txstock-grouped-dropdown.test.js` (BARU, 3 tes).

## Verifikasi
Full suite 9735 tes: 9734 lulus, 0 gagal, 1 skip (setelah `apply-delete-manifest.js`). ESLint 0 error. verify-bundle-freshness lulus. Belum dibuka di browser nyata dengan backup 22 Sep.

## Tidak diubah (butuh keputusan)
- Opsi 2: `syncUnlinkedCatalogPartsToStock` masih membuat baris stok 0 massal.
- Opsi 3: nama impor belum dirapikan (4 pasang beda tanda baca/huruf besar).
- Kolom `price` bearing berisi 6201/6202/6205/6207 (mirip nomor tipe) — perlu dicek manual ke sumber impor.
