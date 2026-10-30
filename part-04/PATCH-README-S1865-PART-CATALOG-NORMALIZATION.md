# PATCH S1865 — Part Catalog Normalization

Patch ini adalah **akumulasi S1863 + S1864 + S1865**. Jangan menerapkan S1865 sebagai patch mandiri.

## Perubahan
- Service master: 100 → 102 components, 13 kategori tetap.
- Tambah `oil-pump` dan `bearing-swingarm` berdasarkan bukti katalog KZRJ.
- Tambah `data/parts-catalog-vario-techno-125-kzrj.json` dengan 103 part records yang diverifikasi.
- Tambah `modules/vehicle/parts-catalog-database.js` dengan lazy/on-demand JSON loading.
- Tidak ada gambar/PDF katalog di bundle.
- Mapping part → maintenance component dipisahkan dari ServiceMasterDB.
