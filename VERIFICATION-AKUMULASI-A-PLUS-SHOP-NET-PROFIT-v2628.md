# Verifikasi akumulasi: Patch A (S2616–S2619 rebased v2627) + Patch B (Shop Net Profit) + S2628 (input opsional) di atas baseline app-main (33)

## Susunan
- Baseline: app-main (33).zip (tidak diubah, bukan full release).
- Patch A (54 file) dan Patch B (7 file): semua dipertahankan. `profit-engine.js` dan `modals.js` digabung 3-arah, 0 konflik.
- Tahap S2628 (patch ini): semua kolom input simulasi Shop Net Profit opsional; kosong != 0.

## S2628 — perubahan
Cakupan: simulasi Delivery Plan / `ProfitEngine.analyzeSale()` (tidak ada penyimpanan data, jadi tidak ada formulir yang bisa diblokir). Form Shop lain (kasir, order, produk, dst) tidak diubah.
- `modules/shop/profit-engine.js`: kosong/null/''/non-angka = belum diketahui (null), tidak pernah jadi 0; angka 0 yang diisi = pernyataan eksplisit. Default `= 0` dihapus dari diskon, biaya tetap, subsidi ongkir, kemasan/biaya lain, pajak beban, pajak dipungut. Qty dan harga boleh kosong (tidak lagi ok:false). Angka turunan (netSales, cogs, grossProfit, sellingCosts, contributionProfit, estimatedNetProfit, margin, cashAfterWithholding, estimatedSettlement, settlementDelta) hanya dihitung bila semua input pembentuknya terisi, selain itu null. Parameter baru opsional: `sellingPrice` (menimpa harga master hanya untuk simulasi) dan `deliveryCost` (ongkir manual total). Output baru: `inputStatus` (EMPTY/FILLED per kolom), `knownSellingCosts` (subtotal sebagian, null bila belum ada), `priceSource`. `missingInputs` kini mencakup HARGA_JUAL, KUANTITAS, DISKON, BIAYA_TETAP, SUBSIDI_ONGKIR, BIAYA_LAIN, PAJAK_BEBAN, PAJAK_DIPUNGUT selain yang lama. Status pajak "Tidak berlaku" = pernyataan eksplisit; hanya pada status itu pajak kosong dihitung 0. Nilai yang sudah diisi tapi tidak valid (negatif, bukan angka, tarif >100%, diskon > penjualan kotor, qty <= 0) tetap ditolak.
- `modules/shop/delivery-plan-ui.js`: qty kosong tidak lagi jadi 0; kotak laba bersih tetap dirender walau qty/rencana pengiriman belum ada; nilai null tampil "belum diisi" (bukan Rp0); daftar kolom yang belum diisi ditampilkan; pembacaan input mengirim undefined untuk kolom kosong; field baru dpSellingPrice dan dpDeliveryCost ikut di-reset saat modal dibuka.
- `modules/shared/modals.js`: tambah input opsional Harga jual per unit dan Ongkir manual total; placeholder "0" diganti "Kosong = belum diisi" agar tidak terlihat seperti default 0; teks bantuan diperbarui. Tidak ada kolom `required`.
- Tes: `shop-net-profit-analysis.test.js` (ekspektasi diperbarui + 7 tes baru kosong vs 0), `shop-net-profit-ui-wiring.test.js` (+2), `shop-net-profit-blank-ui-behavior-s2628.test.js` (baru, 2 tes perilaku UI dengan stub DOM).

## S2628b — perbaikan temuan audit (ongkir dari rencana pengiriman)
- Temuan audit pada patch terpasang di baseline bersih: `LogisticsEngine.route()` mengembalikan `totalPerPcs: 0` bila jarak/ongkos per km kosong, sehingga `analyzeSale` menganggap ongkir "diketahui Rp0" (laba terlalu tinggi tanpa peringatan).
- Perbaikan (`modules/shop/profit-engine.js`): ongkir dari rencana hanya dianggap diketahui bila etape yang dibutuhkan > 0 (produsen selalu; konsumen hanya metode 'antar'; tanpa rincian etape, `totalPerPcs > 0`). Selain itu null + `ONGKIR` masuk daftar belum diisi. Ongkir gratis harus diisi eksplisit lewat "Ongkir manual total" = 0 (placeholder modal diperbarui). `LogisticsEngine`/`OngkirCalc` tidak diubah.
- Tes: 4 tes baru (route 0, etape konsumen kosong, 0 manual eksplisit, reproduksi nyata dengan LogisticsEngine); 4 tes lama yang memakai `totalPerPcs: 0` sebagai ongkir nol diubah memakai `deliveryCost: 0`.

## Build
- `node scripts/build.js --require-minify` → v2630 (bundle A/B, app_production.html, index.html ?v=, sw.js kw-cache-v2630, 5 konstanta versi, docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md). `FILE-HASHES-SHA256.txt` di-refresh (53 entri ok).

## Hasil uji
- Full suite (`node --test tests/*.test.js`, tanpa --test-force-exit): 9130 tests, 9129 pass, 0 fail, 0 cancelled, 1 skipped.
- node --check kedua bundle OK; verify-bundle-freshness OK; verify-window-expose OK (84 modul); ESLint file berubah: 0 error (2 warning lama: global ProfitEngine, variabel catch `e`).
- Re-apply zip ke baseline asli → diff 0 terhadap pohon yang diuji.

## Belum dibuktikan / tetap terbuka
- Browser E2E (tidak tersedia di sandbox).
- Atomisitas stok/order vs posting keuangan (catatan Patch A); rekonsiliasi settlement marketplace dan auto-ambil HPP dari penjualan aktual (catatan Patch B).
- Kriteria "tidak menghalangi menyimpan formulir" hanya relevan untuk simulasi ini (tidak menyimpan); audit input opsional di formulir Shop yang menyimpan data (kasir/order/produk/etalase) belum dilakukan di patch ini.
