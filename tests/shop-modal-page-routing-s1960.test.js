const assert=require('assert');
const fs=require('fs');
const path=require('path');
const p=path.join(__dirname,'..','modules/shared/modal-navigasi.js');
const s=fs.readFileSync(p,'utf8');
assert.match(s,/const SHOP_MODAL_TAB=\{/,'S1960: mapping modal Shop harus terpusat');
for(const [id,tab] of Object.entries({orderModal:'jual',productModal:'etalase',produsenModal:'produsen',produsenHargaModal:'produsen',customerDetailModal:'pelanggan',importKatalogModal:'etalase',importShopExcelModal:'etalase',shopCsvImportModal:'etalase',shopPdfImportModal:'produsen',shopScanModal:'produsen',shopJsonModal:'etalase',mergeProductModal:'etalase',shopKatalogDinamisModal:'etalase',inventoryTransferModal:'etalase',purchaseOrderBatchModal:'produsen',deliveryPlanModal:'jual',biDrillDownModal:'bi'})){
 assert.match(s, new RegExp(id + "\\s*:\\s*'" + tab + "'"), `S1960: ${id} -> ${tab}`);
}
assert.match(s,/function _routeShopModal\(id\)/,'S1960: resolver routing harus ada');
assert.match(s,/_routeShopModal\(id\);\nconst el=document\.getElementById\(id\);/,'S1960: openModal harus memakai routing sebelum membuka modal');
assert.match(s,/if\(typeof setShopTab==='function'\)setShopTab\(tab,null\);/,'S1960: gunakan setShopTab agar modal stack tidak ditutup');
console.log('S1960 shop modal page routing: PASS');
