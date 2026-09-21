const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const page of ['shop','carnotes','pajak']){
 test(`S1891 ${page} has structural domain redesign`,()=>{
  assert.match(html,new RegExp(`<div class="page" id="page-${page}"`));
 });
}
test('Shop has real workspace hero and actions',()=>{
 assert.match(html,/id="shopDomainTitle"/);assert.match(html,/data-action="shopFabOpenOrder"/);assert.match(html,/data-action="shopFabOpenProduct"/);
 for(const id of ['shopTab-kasir','shopTab-jual','shopTab-etalase','shopTab-produsen','shopTab-riwayat','shopTab-pelanggan','shopTab-laporan','shopTab-bi'])assert.match(html,new RegExp(`id="${id}"[^>]*[\\s\\S]*?pwa-workspace-head`));
});
test('Uang Mobil has real workspace hero and action cards',()=>{
 assert.match(html,/id="carDomainTitle"/);assert.match(html,/data-action="openVehicleModal"/);assert.match(html,/data-action="openKmModal"/);assert.match(html,/data-action="VehicleCatalogUI\.open"/);
 for(const id of ['cnTab-insight','cnTab-pajak','cnTab-jalan','cnTab-bbm','cnTab-servis'])assert.match(html,new RegExp(`id="${id}"[^>]*[\\s\\S]*?pwa-workspace-head`));
});
test('Pajak & Zakat has real workspace hero and action cards',()=>{
 assert.match(html,/id="taxDomainTitle"/);assert.match(html,/data-action="setPajakTab"/);assert.match(html,/data-action="setPajakTab"/);
 for(const id of ['pajakTab-zakat','pajakTab-pajak'])assert.match(html,new RegExp(`id="${id}"[^>]*[\\s\\S]*?pwa-workspace-head`));
});
test('Existing critical action hooks remain',()=>{
 for(const hook of ['setShopTab','setCnTab','setPajakTab','Kasir.onSearch','Sparepart.onStockSearchInput'])assert.match(html,new RegExp(hook.replace(/[.]/g,'\\.')),{message:hook});
});
