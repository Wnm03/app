'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function fixture(opts={}){
  const els={};
  const document={getElementById:(id)=>els[id]||(els[id]={value:'',innerHTML:'',style:{},checked:false,classList:{toggle(){}},textContent:''})};
  const toasts=[];let saves=0;
  const D={products:[
    {id:'p1',name:'Cobek',stock:0,hargaJual:50000,hargaBeli:20000,preorder:{aktif:true,kuota:5,estimasi:'2026-12-01',catatan:''}},
    {id:'p2',name:'Ulekan',stock:10,hargaJual:30000,hargaBeli:10000},
    {id:'p3',name:'Batu',stock:3,hargaJual:9000,hargaBeli:1000,preorder:{aktif:true,kuota:null}},
  ],cobek:[],accounts:[{id:'a1',name:'Kas',emoji:'💰'}],transactions:[],piutang:[]};
  let n=0;
  const ctx=loadSource(['modules/shop/preorder.js'],{D,document,escapeHtml:s=>String(s??''),uid:()=>'id'+(++n),todayStr:()=>'2026-11-01',
    toast:m=>toasts.push(m),save:()=>{saves++;return opts.saveFails?false:true;},askConfirm:async()=>true},['Preorder']);
  return {P:ctx.Preorder,D,els,toasts,ctx,saves:()=>saves};
}
const cust={name:'Budi',phone:'081'};

test('create: butuh preorder aktif, nama, qty valid',()=>{
  const {P,D}=fixture();
  assert.match(P.create({productId:'p2',qty:1,customer:cust}).message,/belum diaktifkan/);
  assert.match(P.create({productId:'p1',qty:0,customer:cust}).message,/Jumlah/);
  assert.match(P.create({productId:'p1',qty:1,customer:{name:' '}}).message,/Nama/);
  assert.match(P.create({productId:'zz',qty:1,customer:cust}).message,/tidak ditemukan/);
  assert.equal((D.preorders||[]).length,0);
  const r=P.create({productId:'p1',qty:2,customer:cust});
  assert.ok(r.ok);assert.equal(D.preorders[0].status,'open');
  assert.equal(D.products[0].stock,0,'stok tidak berubah');
  assert.equal(D.transactions.length,0);assert.equal(D.cobek.length,0);
});

test('kuota: hanya preorder open yang memakai kuota; batal mengembalikan',()=>{
  const {P}=fixture();
  assert.ok(P.create({productId:'p1',qty:3,customer:cust}).ok);
  assert.equal(P.quota('p1').sisa,2);
  assert.match(P.create({productId:'p1',qty:3,customer:cust}).message,/Kuota/);
  const r2=P.create({productId:'p1',qty:2,customer:cust});
  assert.ok(r2.ok);assert.equal(P.quota('p1').sisa,0);
  assert.ok(P.cancel(r2.preorder.id).ok);
  assert.equal(P.quota('p1').sisa,2);
  assert.equal(P.quota('p3').sisa,null,'kuota kosong = tanpa batas');
  assert.ok(P.create({productId:'p3',qty:999,customer:cust}).ok);
});

test('idempotency: kirim ulang dengan key sama tidak menggandakan',()=>{
  const {P,D}=fixture();
  const a=P.create({productId:'p1',qty:1,customer:cust,idempotencyKey:'k1'});
  const b=P.create({productId:'p1',qty:1,customer:cust,idempotencyKey:'k1'});
  assert.ok(b.duplicate);assert.equal(D.preorders.length,1);assert.equal(a.preorder.id,b.preorder.id);
});

test('save gagal: create/cancel/setConfig di-rollback',()=>{
  const {P,D}=fixture({saveFails:true});
  assert.equal(P.create({productId:'p1',qty:1,customer:cust}).ok,false);
  assert.equal(D.preorders.length,0);
  D.preorders.push({id:'x',productId:'p1',qty:1,status:'open',customer:cust});
  assert.equal(P.cancel('x').ok,false);assert.equal(D.preorders[0].status,'open');
  const before=JSON.stringify(D.products[1]);
  assert.equal(P.setConfig('p2',{aktif:true,kuota:3}).ok,false);
  assert.equal(JSON.stringify(D.products[1]),before);
});

test('setConfig: kuota tidak boleh di bawah preorder terbuka; validasi angka',()=>{
  const {P}=fixture();
  P.create({productId:'p1',qty:4,customer:cust});
  assert.match(P.setConfig('p1',{aktif:true,kuota:3}).message,/lebih kecil/);
  assert.match(P.setConfig('p1',{aktif:true,kuota:-1}).message,/tidak valid/);
  assert.ok(P.setConfig('p1',{aktif:true,kuota:''}).ok);
  assert.equal(P.quota('p1').kuota,null);
});

test('cancel: hanya dari open, tidak ada efek uang/stok',()=>{
  const {P,D}=fixture();
  const r=P.create({productId:'p1',qty:1,customer:cust});
  assert.ok(P.cancel(r.preorder.id).ok);
  assert.match(P.cancel(r.preorder.id).message,/dibatalkan/);
  assert.equal(D.transactions.length,0);
});

test('penuhi: stok belum cukup ditolak; cukup membuka Order terisi; markFulfilled sekali saja',()=>{
  const {P,D,ctx,toasts}=fixture();
  const opened=[];
  ctx.Order={items:[],preorderId:null,openModal(){opened.push(1);},renderItems(){}};
  const r=P.create({productId:'p1',qty:2,customer:cust});
  assert.equal(P.beginFulfil(r.preorder.id).ok,false);assert.match(toasts.pop(),/Restock/);assert.equal(opened.length,0);
  D.products[0].stock=5;
  assert.ok(P.beginFulfil(r.preorder.id).ok);
  assert.equal(ctx.Order.preorderId,r.preorder.id);assert.equal(ctx.Order.items[0].qty,2);
  assert.equal(P.canFulfil(r.preorder.id,[{productId:'p2'}]).ok,false,'keranjang tanpa produk PO ditolak');
  assert.ok(P.markFulfilled(r.preorder.id,'shop1').ok);
  assert.equal(D.preorders[0].status,'fulfilled');assert.equal(D.preorders[0].shopId,'shop1');
  assert.equal(P.markFulfilled(r.preorder.id,'shop2').ok,false,'tidak bisa dipenuhi 2x');
  assert.equal(P.quota('p1').terpakai,0);
});

test('restore: D.preorders ikut {...D,...imp}; backup lama tanpa preorders aman',()=>{
  const {P,D}=fixture();
  P.create({productId:'p1',qty:1,customer:cust});
  const backup=JSON.parse(JSON.stringify(D));
  const restored={...D,...backup};
  assert.equal(restored.preorders.length,1);
  const legacy=JSON.parse(JSON.stringify(D));delete legacy.preorders;
  const {P:P2,D:D2}=fixture();delete D2.preorders;
  assert.equal(JSON.stringify(P2.summary()),JSON.stringify({open:0,fulfilled:0,cancelled:0}));assert.ok(Array.isArray(D2.preorders));
});

// --- integrasi nyata: Order._saveInner memanggil recordShopSale sungguhan ---
test('integrasi Order: Penuhi preorder lewat recordShopSale, tanpa pemasukan ganda',()=>{
  const files=['modules/shop/cobek-tx-cart.js','modules/shop/cobek-order.js','modules/shop/preorder.js'];
  const els={};const document={getElementById:(id)=>els[id]||(els[id]={value:'',checked:true,innerHTML:'',style:{},classList:{toggle(){}},textContent:''})};
  const D={products:[{id:'p1',name:'Cobek',stock:5,hargaJual:50000,hargaBeli:20000,preorder:{aktif:true,kuota:5}}],cobek:[],accounts:[{id:'a1',name:'Kas',emoji:'💰'}],transactions:[],piutang:[]};
  let saves=0,paySync=0;
  const ctx=loadSource(files,{D,document,escapeHtml:s=>String(s??''),uid:(()=>{let n=0;return()=>'u'+(++n)})(),todayStr:()=>'2026-11-01',toast(){},save:()=>{saves++;return true;},
      syncShopSalePayment:(o)=>{paySync++;return{ok:true,dp:o.total,sisa:0};},openModal(){},closeModal(){},renderProductList(){},renderShop(){},renderSiapPulang(){},fmtFull:n=>n,fmt:n=>n,
      Etalase:{bundleAddonShape:()=>null,bracketRange:()=>null,renderModalStat(){}}},['Order','Preorder','recordShopSale']);
  ctx.Order.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:2,harga:50000,lineTotal:100000}],subtotal:100000,diskonEfektif:0,ongkir:0,total:100000,profit:60000});
  const po=ctx.Preorder.create({productId:'p1',qty:2,customer:{name:'Budi'}});
  assert.ok(po.ok);
  ctx.Order.items=[{productId:'p1',qty:2,hargaOverride:null}];ctx.Order.preorderId=po.preorder.id;
  ctx.Order._saveInner();
  assert.equal(D.cobek.length,1,'tepat satu penjualan');
  assert.equal(D.preorders[0].status,'fulfilled');assert.equal(D.preorders[0].shopId,D.cobek[0].id);
  assert.equal(D.products[0].stock,3);assert.equal(D.transactions.length,1,'tepat satu transaksi pemasukan (tidak ganda)');assert.equal(Number(D.transactions[0].amount||D.transactions[0].nominal||0),100000);assert.equal(D.piutang.length,0);
  assert.equal(ctx.Order.preorderId,null);
  // Simulasikan pembukaan transaksi baru: guard idempotensi hanya berlaku pada modal preorder yang baru saja disubmit.
  ctx.Order._preorderSubmitted=false;
  // penjualan kedua tanpa preorderId tidak menyentuh preorder
  ctx.Order._saveInner();
  assert.equal(D.cobek.length,2);assert.equal(D.preorders.length,1);
});

test('integrasi Order: preorder yang sudah dibatalkan memblokir simpan tanpa mutasi',()=>{
  const els={};const document={getElementById:(id)=>els[id]||(els[id]={value:'',checked:true,innerHTML:'',style:{},classList:{toggle(){}}})};
  const D={products:[{id:'p1',name:'Cobek',stock:5,hargaJual:1,hargaBeli:1,preorder:{aktif:true,kuota:5}}],cobek:[],accounts:[{id:'a1'}],transactions:[],piutang:[]};
  const toasts=[];
  const ctx=loadSource(['modules/shop/cobek-tx-cart.js','modules/shop/cobek-order.js','modules/shop/preorder.js'],{D,document,escapeHtml:s=>String(s??''),uid:(()=>{let n=0;return()=>'u'+(++n)})(),todayStr:()=>'x',toast:m=>toasts.push(m),save:()=>true,syncShopSalePayment:()=>({ok:true,dp:1,sisa:0}),openModal(){},closeModal(){},renderProductList(){},renderShop(){},renderSiapPulang(){},Etalase:{bundleAddonShape:()=>null,bracketRange:()=>null,renderModalStat(){}}},['Order','Preorder']);
  ctx.Order.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:1,harga:1,lineTotal:1}],subtotal:1,diskonEfektif:0,ongkir:0,total:1,profit:0});
  const po=ctx.Preorder.create({productId:'p1',qty:1,customer:{name:'A'}});
  ctx.Preorder.cancel(po.preorder.id);
  ctx.Order.items=[{productId:'p1',qty:1}];ctx.Order.preorderId=po.preorder.id;
  ctx.Order._saveInner();
  assert.equal(D.cobek.length,0);assert.equal(D.products[0].stock,5);assert.match(toasts.join('|'),/dibatalkan/);
});
