// tx-cobek.js — domain "Stok/Penjualan Shop (Shop)" pada form Transaksi.
// Dipindah ke modules/finance/tx-cobek.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split transaksi.js"
// bagian ke-9) -- tetap fungsi global, tetap dipanggil persis sama dari sini
// (updateTxVehiclePanels di transaksi.js), dari HTML (modals.js), maupun dari
// tempat lain yang butuh deteksi kategori Shop/Shop.
//
// Catatan: fungsi-fungsi panel form-nya sendiri (populateTxShopStockSelect,
// onTxShopStockItemChange, toggleTxShopStockFields, resetShopStockCart,
// applyTxShopStockFromTx, populateTxShopSaleSelect, onTxShopSaleItemChange,
// toggleTxShopSaleFields, resetTxShopSaleCart, applyTxShopSaleFromTx, dst)
// SUDAH ada di cobek.js sejak awal (bukan hasil split sesi ini) -- transaksi.js
// hanya memanggilnya. isShopStockCatName() adalah satu-satunya bagian domain
// Shop yang tersisa murni di source transaksi.js (dipakai buat mendeteksi
// kapan panel Stok/Penjualan Shop harus muncul di updateTxVehiclePanels()).
function isShopStockCatName(catName,subName){
if(/cobek|shop/i.test(catName||'')||/cobek|shop/i.test(subName||''))return true;
// Fallback robust terhadap rename kategori/subkategori: cocokkan lewat ID internal
// yang tetap 'sub_cb_cobek'/'sub_cbb_cobek' walau nama tampilannya sudah diubah user
// (mis. dari "Shop" jadi "Shop") -- ini yang bikin panel Stok/Penjualan Shop hilang
// kalau hanya mengandalkan cocokkan teks nama saja.
const allCats=[...(D.categories.income||[]),...(D.categories.expense||[])];
const cat=allCats.find(c=>c.name===catName);
if(cat){
const sub=(cat.subs||[]).find(s=>s.name===subName);
if(sub&&(sub.id==='sub_cb_cobek'||sub.id==='sub_cbb_cobek'))return true;
}
return false;
}
