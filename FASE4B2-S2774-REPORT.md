# Fase 4B lanjutan — Tabel padat Aset, Dana Titipan, dan produk Shop di layar lebar (S2774)

Rujukan: RENCANA-UPGRADE-FRONTEND.md §D Fase 4 ("Tabel padat untuk riwayat transaksi/produk di ≥1024px"). Melanjutkan S2773 (transaksi Uang + Riwayat).

## Perubahan
- **Aset** (`modules/asset/aset.js`): daftar aset memakai `assetTableHTML` di ≥1024px untuk semua tema. Kondisi modern lama dipertahankan persis; jalur kartu tidak berubah.
- **Dana Titipan** (`dana-titipan-portfolio-render.js`): tiga titik (daftar owner, daftar holding, riwayat pengembalian) memakai tabel padat di ≥1024px untuk semua tema. Gate modern lama untuk owner dan holding tidak diubah (pre-`if` tambahan). Markup mini-tabel riwayat dipindah ke `_returnsTableHtml()` tanpa perubahan isi; gate modern memanggilnya.
- **Shop** (`cobek-etalase.js`): tabel produk baru (`Etalase.productTableHTML` / `productTableRowHTML`) di ≥1024px untuk semua tema, termasuk modern. Kolom: Produk (+kategori/produsen/grup/peringatan), Stok, Harga Jual (+modal/reseller, diskon), Markup, Aksi. Angka dari sumber yang sama dengan kartu (PricingService/InventoryService/ProductStore); rumus markup tidak diubah. Aksi edit/duplikat/hapus/lepas-grup memakai `data-action` yang sama; klik baris membuka edit. Produk dengan data rusak tampil sebagai baris fallback, tidak menjatuhkan tabel. Filter, urutan, dan jalur kartu <1024px tidak berubah.
- **Pindah ukuran layar** (`tx-list-cashflow.js`): listener breakpoint 4B diperluas — Aset dan Etalase Shop dirender ulang saat melintasi 1024px; Dana Titipan ikut lewat `renderKeuangan()`. Tema modern dilewati untuk Uang/Aset/Dana Titipan (sudah tabel), tetapi Etalase tetap dirender ulang.
- `tokens.css` blok FASE 4B2 (tanpa `!important`): gaya tombol nama (`.tx-tbl-name-btn`, sebelumnya hanya `[data-theme="modern"]`), perataan tabel produk.
- Tes baru: `tests/fase4b2-s2774-wide-tables-aset-titipan-shop.test.js` (8 tes; 4 menjalankan kode di sandbox VM).

## Verifikasi yang benar-benar dijalankan
- Tes terkait (S637–S645, S608, Shop, 4A/4B) lulus sebelum build.
- Full suite: lihat `PATCH-MANIFEST.md` / ringkasan sesi untuk angka akhir. 15 kegagalan lama (BBM/Car Notes, guard file S2720, S1780) identik dengan baseline S2773.
- Build 2774 (`SKIP_LINT=1`), cek sintaks bundle lulus, hash disegarkan.

## Belum / batas klaim
- Tidak diukur di browser (Chromium tidak tersedia di sesi ini): tampilan tabel di 1024–1440px pada tema Dark/Light/Graphite belum dilihat. Jalankan `tools/capture-fase1b-extended.py`.
- Tabel pembungkus owner Dana Titipan masih memuat kartu `<details>` di dalam sel (pola modern S645), bukan kolom per sel. Header "Pemilik / Pokok → Kini / ±" hanya acuan visual.
- Belum: master–detail (4C), grid tablet, lint/minify penuh, Safari/Firefox, Android. `!important` 186, `@layer` belum.
