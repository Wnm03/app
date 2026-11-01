'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function fixture(products){
 const store={};
 const document={getElementById(id){return store[id]||(store[id]={innerHTML:'',value:'',style:{},classList:{toggle(){}}});}};
 const D={products,cobekKategori:[{id:'a',name:'Alat'},{id:'b',name:'Batu'}],produsen:[],inventoryTransfers:[],deliveryPlans:[]};
 const ctx=loadSource(['modules/shop/cobek-etalase.js'],{D,document,escapeHtml:s=>String(s??''),fmt:n=>'Rp'+(Number(n)||0),shopKategoriName:id=>(D.cobekKategori.find(x=>String(x.id)===String(id))||{}).name||'',sameId:(a,b)=>String(a)===String(b),ProductRepository:{cloneProduct:p=>({ok:true,product:{...p}}),saveProduct:()=>({ok:true})},save(){},toast(){},askConfirm:async()=>true},['Etalase']);
 return {ctx,D,store};
}
const products=[
 {id:'p1',name:' zebra ',kategoriId:'a',stock:0,hargaJual:40,hargaBeli:10},
 {id:'p2',name:'Alpha',kategoriId:'b',stock:1,hargaJual:30,hargaBeli:10,priceGroupId:'g'},
 {id:'p3',name:'alpha',kategoriId:'a',stock:4,hargaJual:20,hargaBeli:10,priceGroupId:'g'},
 {id:'p4',name:'',stock:8,hargaJual:10,hargaBeli:10},
];
test('Etalase filters category, stock, search combination and empty state',()=>{
 const {ctx,store}=fixture(products);const e=ctx.Etalase;e.renderList();
 e.setCategory('a');assert.match(store.productList.innerHTML,/zebra/);assert.doesNotMatch(store.productList.innerHTML,/Alpha/);
 e.setStock('out');assert.match(store.productList.innerHTML,/zebra/);assert.doesNotMatch(store.productList.innerHTML,/alpha/);
 e.setSearch('tidak ada');assert.match(store.productList.innerHTML,/Tidak ada produk yang cocok/);
 e.resetFilters();assert.match(store.productList.innerHTML,/zebra/);
});
test('Etalase sorting A-Z/Z-A is stable, locale aware and keeps original action indices',()=>{
 const {ctx,store}=fixture(products);const e=ctx.Etalase;e.filterState.sort='az';e.renderList();
 const html=store.productList.innerHTML;assert.ok(html.indexOf('Alpha')<html.indexOf('alpha'));
 assert.match(html,/data-action="openProductModal" data-args="\[1\]"/);
 assert.match(html,/data-action="delProduct" data-args="\[1\]"/);
 assert.match(html,/data-action="Etalase\.duplicateProduct" data-args="\[1\]"/);
 assert.match(html,/data-action="Etalase\.unlinkFromGroup" data-args="\[1\]"/);
 e.setSort('za');assert.ok(store.productList.innerHTML.indexOf('zebra')<store.productList.innerHTML.indexOf('Alpha'));
});
test('Etalase stock chips and weight filter render without changing stockStatus',()=>{
 const {ctx,store}=fixture(products);ctx.Etalase.setStock('mid');assert.match(store.productList.innerHTML,/alpha/);assert.doesNotMatch(store.productList.innerHTML,/zebra/);
 assert.equal(ctx.Etalase.stockFilterStatus({stock:-1}),'out');
});
test('InventoryEngine adds Habis separately without changing legacy stockStatus',()=>{
 const isolated=loadSource(['modules/shop/inventory-engine.js'],{D:{products:[]}},['InventoryEngine']);
 assert.equal(isolated.InventoryEngine.stockAvailabilityStatus({stock:0}).label,'Habis');
 assert.equal(isolated.InventoryEngine.stockAvailabilityStatus({stock:-2}).status,'out');
 assert.equal(isolated.InventoryEngine.stockStatus({stock:0}).label,'Menipis');
});
test('Etalase supports Tanpa kategori, all stock states, numeric sorts and weight-missing filter',()=>{
 const {ctx,store,D}=fixture(products);const e=ctx.Etalase;
 e.setCategory('__none');assert.match(store.productList.innerHTML,/shop-product-name"><\/div>/);
 e.setCategory('*');
 for(const state of ['out','low','mid','ok']){e.setStock(state);assert.ok(store.productList.innerHTML.length>0);}
 e.setStock('*');e.setSort('stockAsc');assert.ok(store.productList.innerHTML.indexOf(' zebra ')<store.productList.innerHTML.indexOf('Alpha'));
 e.setSort('stockDesc');assert.ok(store.productList.innerHTML.indexOf('8 pcs')<store.productList.innerHTML.indexOf('Habis'));
 e.setSort('priceAsc');assert.ok(store.productList.innerHTML.indexOf('Rp10')<store.productList.innerHTML.indexOf('Rp40'));
 e.setSort('priceDesc');assert.ok(store.productList.innerHTML.indexOf('Rp40')<store.productList.innerHTML.indexOf('Rp10'));
 D.inventoryTransfers=[{items:[{productId:'p3'}]}];e.setWeight('missing');assert.match(store.productList.innerHTML,/alpha/);assert.doesNotMatch(store.productList.innerHTML,/Alpha/);
 e.resetFilters();assert.equal(e.filterState.sort,'saved');assert.equal(e.filterState.weight,'*');
});
