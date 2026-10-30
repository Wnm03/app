# Audit rantai akumulasi dan perbaikan — Shop Net Profit

## Baseline dan rantai
- Baseline source: `app-main (33).zip`
- SHA-256 baseline: `9aacbd66c75f30810573d67eb24059c8a3b0418788dd05e6c41c693d0b5dc774`
- Patch sebelumnya: `PATCH-SHOP-NET-PROFIT-ANALYSIS.zip`
- SHA-256 patch sebelumnya: `d849a220387532b2b75d139760a8a1a8e39fb0c89566627777f25e6b48ac801a`
- Patch ini mempertahankan seluruh 5 file source/test sebelumnya dan mengakumulasikan validasi input + regression tests; tidak menimpa baseline atau bundle produksi.

## Rantai yang ditelusuri
- `scripts/build.js` mendaftarkan `modules/shop/profit-engine.js` sebelum `modules/shop/delivery-plan-ui.js`.
- `DeliveryPlanUI.calc()` memanggil `ProfitEngine.analyzeSale()` dan hanya merender simulasi; tidak menyimpan data.
- Jalur penjualan aktual `modules/shop/cobek-tx-cart.js` menyimpan `unitCost` dan `cogs` pada item penjualan, tetapi simulasi Delivery Plan tidak memilih transaksi aktual dan tidak otomatis mengambil snapshot biaya dari cart. Maka labelnya harus tetap estimasi.
- `ShopSotGovernance.cogsForSale()` menghitung dari `cogs`/`unitCost` tersimpan; tes S1931–S1940 meliputi snapshot biaya PO, retur/COGS reversal, policy, dan reconciliation evidence.
- `calculateProfit()` lama tetap menjadi jalur legacy yang hanya menghitung harga jual - harga beli master - ongkir; tidak diubah untuk menghindari regresi.

## Perbaikan tambahan dalam patch ini
- Input kuantitas nol sekarang ditolak.
- Nilai biaya/tarif negatif atau malformed ditolak, tidak disamarkan menjadi nol.
- Tarif persentase lebih dari 100% ditolak.
- Diskon penjual melebihi penjualan kotor ditolak.
- Status pajak di luar `UNKNOWN`, `CONFIRMED`, `NOT_APPLICABLE` ditolak.
- Nominal settlement negatif ditolak.
- Output membedakan `resultMode: ESTIMATE` dan `actualReady`; lengkapnya input simulasi tidak lagi berarti hasil aktual sudah siap.
- UI Delivery Plan menambah input HPP historis per unit yang bersifat opsional, meneruskannya ke engine, dan meresetnya saat modal dibuka ulang.

## Hasil verifikasi
- 476/476 PASS untuk glob tes Shop/profit/purchase/inventory.
- 56/56 PASS pada seleksi tes sempit sebelumnya; setelah hardening, tes tambahan termasuk dalam run glob 476.
- ESLint file berubah: 0 error, 1 warning `no-unused-vars` untuk deklarasi global `ProfitEngine` sesuai pola source lama.
- Full suite belum terselesaikan; tidak ada klaim seluruh aplikasi lulus.
- `build.js` tidak dijalankan, tidak ada bundle yang berubah, tidak ada perubahan schema atau data persisten.

## Target yang masih terbuka
1. Rekonsiliasi settlement marketplace aktual belum memiliki adapter/sumber data yang terverifikasi.
2. Simulasi UI belum otomatis mengambil `unitCost`/`cogs` dari item penjualan aktual; input HPP historis kini dapat diberikan manual, sedangkan harga master hanya estimasi.
3. Tarif marketplace tetap input manual dan perlu tanggal berlaku/sumber tarif sebelum dianggap terverifikasi.
4. Perlu keputusan akuntansi dan pengujian per skenario untuk alokasi biaya masuk pembelian, PPN masukan/keluaran, dan PPh dipungut; jangan otomatis menganggap semua pajak sebagai beban laba.
5. Full test suite dan UI runtime/E2E belum selesai diverifikasi.

## Keputusan keselamatan
Patch ini memperbaiki simulasi dan validasi, bukan mengklaim fitur pembukuan laba bersih final sudah lengkap. Jangan gunakan angka estimasi sebagai angka akuntansi/pajak resmi tanpa rekonsiliasi bukti transaksi.
