'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

test('P1.c: gagal simpan hapus produk mengembalikan produk dan seluruh preorder terbuka',async()=>{
  const D={products:[{id:'p1',name:'Barang',stock:0}],preorders:[
    {id:'po1',productId:'p1',qty:2,status:'open',customer:{name:'A'}},
    {id:'po2',productId:'p1',qty:1,status:'open'}
  ],cobek:[]};
  const ctx=loadSource(['modules/shop/preorder.js','modules/shop/cobek-etalase.js'],{
    D,window:{},document:{getElementById:()=>null},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,
    askConfirm:async()=>true,save:()=>false,toast(){},
    ShopCanonicalWriter:{
      removeById(id){D.products=D.products.filter(p=>p.id!==id);return{ok:true};},
      replaceSnapshot(rows){D.products=rows;return{ok:true};}
    }
  },['Etalase','Preorder']);
  await ctx.Etalase.delete(0);
  assert.equal(D.products.length,1);
  assert.equal(D.products[0].id,'p1');
  assert.deepEqual(D.preorders.map(p=>p.status),['open','open']);
});

test('P1.c: hapus produk dan pembatalan preorder tersimpan dalam satu save',async()=>{
  const D={products:[{id:'p1',name:'Barang',stock:0}],preorders:[{id:'po1',productId:'p1',qty:2,status:'open'}],cobek:[]};
  let saves=0;
  const ctx=loadSource(['modules/shop/preorder.js','modules/shop/cobek-etalase.js'],{
    D,window:{},document:{getElementById:()=>null},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,
    askConfirm:async()=>true,save:()=>{saves++;return true;},toast(){},
    ShopCanonicalWriter:{removeById(id){D.products=D.products.filter(p=>p.id!==id);return{ok:true};},replaceSnapshot(rows){D.products=rows;return{ok:true};}}
  },['Etalase','Preorder']);
  await ctx.Etalase.delete(0);
  assert.equal(D.products.length,0);
  assert.equal(D.preorders[0].status,'cancelled');
  assert.equal(D.preorders[0].cancelReason,'produk dihapus');
  assert.equal(saves,1);
});


test('P1.c: jika ProductRepository/ShopCanonicalWriter menolak hapus, preorder tidak dibatalkan',async()=>{
  const D={products:[{id:'p1',name:'Barang',stock:0}],preorders:[{id:'po1',productId:'p1',qty:2,status:'open'}],cobek:[]};
  let saves=0;
  const ctx=loadSource(['modules/shop/preorder.js','modules/shop/cobek-etalase.js'],{
    D,window:{},document:{getElementById:()=>null},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,
    askConfirm:async()=>true,save:()=>{saves++;return true;},toast(){},
    ShopCanonicalWriter:{removeById:()=>({ok:false,reason:'simulated delete failure'}),replaceSnapshot(rows){D.products=rows;return{ok:true};}}
  },['Etalase','Preorder']);
  await ctx.Etalase.delete(0);
  assert.equal(D.products.length,1);
  assert.equal(D.preorders[0].status,'open');
  assert.equal(saves,0);
});

test('P1.c: menonaktifkan konfigurasi preorder tidak membatalkan antrean terbuka',()=>{
  const D={products:[{id:'p1',name:'Barang',preorder:{aktif:true,kuota:5}}],preorders:[{id:'po1',productId:'p1',qty:2,status:'open'}]};
  const ctx=loadSource(['modules/shop/preorder.js'],{D,save:()=>true},['Preorder']);
  assert.ok(ctx.Preorder.setConfig('p1',{aktif:false,kuota:5}).ok);
  assert.equal(D.products[0].preorder.aktif,false);
  assert.equal(D.preorders[0].status,'open');
  assert.equal(ctx.Preorder.openQty('p1'),2);
});

test('P1.d: backup shop parsial memasukkan preorder; validator dan restore legacy mengenali array additive',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/backup-restore.js'),'utf8');
  assert.match(src,/out\.preorders=Array\.isArray\(D\.preorders\)\?D\.preorders:\[\]/);
  assert.match(src,/const arrayKeys=\[[^\]]*'preorders'/);
  assert.match(src,/const knownKeys=\[[^\]]*'preorders'/);
  assert.match(src,/if\(!Array\.isArray\(D\.preorders\)\)D\.preorders=\[\]/);
  const product={id:'p1',preorder:{aktif:true,kuota:4}};
  const D={products:[product],preorders:[{id:'po1',productId:'p1',qty:2,status:'open'}]};
  const restored={...D,...JSON.parse(JSON.stringify(D))};
  assert.equal(restored.preorders[0].id,'po1');
  assert.equal(restored.products[0].preorder.kuota,4);
  const legacy={products:[{id:'old'}]};
  const migrated={...legacy};if(!Array.isArray(migrated.preorders))migrated.preorders=[];
  assert.deepEqual(migrated.preorders,[]);
});

test('P1.d: app-wide integrity audit melaporkan pemeriksaan preorder sebagai warning-only',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','scripts/app-wide-data-integrity-audit.js'),'utf8');
  assert.match(src,/Preorder runtime integrity/);
  assert.match(src,/warnings, never auto-repair or fail the static gate/);
});

test('P1.f: modal Order memperingatkan qty keranjang yang berbeda dari qty preorder',()=>{
  const els={orderItemList:{innerHTML:''},oTotalDisplay:{},oProfitDisplay:{}};
  const document={getElementById:id=>els[id]||(els[id]={value:'',innerHTML:'',textContent:'',style:{}})};
  const D={products:[{id:'p1',name:'Barang',stock:10,hargaJual:100,hargaBeli:50}],preorders:[{id:'po1',productId:'p1',qty:4,status:'open'}]};
  const ctx=loadSource(['modules/shop/cobek-order.js','modules/shop/preorder.js'],{
    D,document,escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,fmtFullSigned:n=>'Rp'+n,
    toast(){},todayStr:()=>'',uid:()=> 'tx1'
  },['Order','Preorder']);
  ctx.Order.preorderId='po1';ctx.Order.items=[{productId:'p1',qty:2,hargaOverride:null}];
  ctx.Order.computeTotals=()=>({lines:[{product:D.products[0],productId:'p1',qty:2,harga:100,lineTotal:200}],total:200,profit:100});
  ctx.Order.renderItems();
  assert.match(els.orderItemList.innerHTML,/Qty keranjang \(2\) berbeda dari qty preorder \(4\)/);
  assert.match(els.orderItemList.innerHTML,/ditandai <b>dipenuhi penuh<\/b>/);
});

test('P1.g: pemanggilan simpan kedua setelah preorder berhasil tidak membuat penjualan kedua',()=>{
  const files=['modules/shop/cobek-tx-cart.js','modules/shop/cobek-order.js','modules/shop/preorder.js'];
  const els={};const document={getElementById:id=>els[id]||(els[id]={value:'',checked:true,innerHTML:'',style:{},classList:{toggle(){}},textContent:''})};
  const D={products:[{id:'p1',name:'Barang',stock:5,hargaJual:100,hargaBeli:50}],cobek:[],accounts:[{id:'a1'}],transactions:[],piutang:[],preorders:[{id:'po1',productId:'p1',qty:1,status:'open'}]};
  let saves=0;
  const ctx=loadSource(files,{D,document,escapeHtml:s=>String(s??''),uid:()=> 'tx1',todayStr:()=>'2026-11-01',toast(){},save(){saves++;return true;},
    syncShopSalePayment:o=>({ok:true,dp:o.total,sisa:0}),openModal(){},closeModal(){},renderProductList(){},renderShop(){},renderSiapPulang(){},renderShopRecent(){},fmtFull:n=>n,fmt:n=>n,
    Etalase:{bundleAddonShape:()=>null,bracketRange:()=>null,renderModalStat(){}}},['Order','recordShopSale','Preorder']);
  ctx.Order.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:1,harga:100,lineTotal:100}],subtotal:100,diskonEfektif:0,ongkir:0,total:100,profit:50});
  ctx.Order.items=[{productId:'p1',qty:1,hargaOverride:null}];ctx.Order.preorderId='po1';
  ctx.Order._saveInner();ctx.Order._saveInner();
  assert.equal(D.cobek.length,1);
  assert.equal(D.transactions.length,1);
  assert.equal(D.preorders[0].status,'fulfilled');
  assert.equal(saves,1);
});

test('P2.a: tile stok habis preorder tetap actionable ke form, stok habis biasa memberi toast action',()=>{
  const el={innerHTML:'',classList:{toggle(){}}};
  const document={getElementById:id=>id==='kasirGrid'?el:null,querySelectorAll:()=>[]};
  const D={products:[
    {id:'p1',name:'Preorder Item',stock:0,hargaJual:100,hargaBeli:50,preorder:{aktif:true}},
    {id:'p2',name:'Habis Biasa',stock:0,hargaJual:100,hargaBeli:50}
  ],cobekKategori:[],accounts:[]};
  const ctx=loadSource(['modules/business/kasir.js'],{D,document,window:{},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,toast(){}},['Kasir']);
  ctx.Kasir.renderGrid();
  assert.match(el.innerHTML,/data-action="Kasir\.openPreorderForm" data-args='\["p1"\]'/);
  assert.match(el.innerHTML,/PREORDER/);
  assert.match(el.innerHTML,/data-action="Kasir\.stockOutNotice" data-args='\["p2"\]'/);
  assert.doesNotMatch(el.innerHTML,/Kasir\.addToCart/);
});

test('P3.a: kembalian hanya display; input DP tetap nilai sumber rekonsiliasi tanpa dimutasi',()=>{
  const els={
    kasirCartList:{innerHTML:''},kasirSubDisplay:{},kasirDiskonRow:{style:{}},kasirOngkirRow:{style:{}},
    kasirTotalDisplay:{},kasirChangeRow:{style:{}},kasirChangeDisplay:{},kasirProfitDisplay:{},
    kasirCheckoutBtn:{},kasirFloatbar:{classList:{toggle(){}}},kasirFloatCount:{},kasirFloatTotal:{},
    kasirDP:{value:'150'}
  };
  const document={getElementById:id=>els[id]||null,querySelectorAll:()=>[]};
  const D={products:[],accounts:[]};
  const ctx=loadSource(['modules/business/kasir.js'],{D,document,window:{},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,fmtFullSigned:n=>'Rp'+n},['Kasir']);
  ctx.Kasir.computeTotals=()=>({lines:[],subtotal:100,diskonEfektif:0,ongkir:0,total:100,profit:10});
  ctx.Kasir.renderCart();
  assert.equal(els.kasirChangeRow.style.display,'flex');
  assert.equal(els.kasirChangeDisplay.textContent,'Rp50');
  assert.equal(els.kasirDP.value,'150','nilai DP input tidak diubah');
});

test('P3.b: struk transaksi tersimpan memuat nomor, kasir/toko, metode, DP, piutang, dan kembalian',()=>{
  const D={profile:{namaBisnis:'Toko Uji',namaKasir:'Rina'},accounts:[{id:'a1',name:'Kas Utama'}]};
  const ctx=loadSource(['modules/business/kasir.js'],{D,document:{getElementById:()=>null},window:{},fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,escapeHtml:s=>String(s??'')},['Kasir']);
  ctx.Kasir.lastReceipt={txId:'tx-123',shopId:'shop-1',date:'2026-11-01',customerName:'Budi',accountId:'a1',lines:[{name:'Barang',qty:2,lineTotal:200}],diskon:0,ongkir:0,total:200,dp:200,sisa:0,cashReceived:250,change:50};
  const receipt=ctx.Kasir.buildReceiptText();
  for(const text of ['Toko Uji','tx-123','Rina','Tunai','Kas Utama','Uang diterima: Rp250','Pembayaran tercatat (DP): Rp200','Sisa piutang: Rp0','Kembalian: Rp50'])assert.ok(receipt.includes(text),text);
});


test('P2.a: form Kasir mengirim preorder ke Preorder.create dengan idempotency key',()=>{
  const nodes={kasirPoName:{value:''},kasirPoPhone:{value:''},kasirPoQty:{value:'1'},kasirPoNote:{value:''}};
  const body={appendChild(node){nodes.kasirPreorderModal=node;}};
  const document={
    getElementById:id=>nodes[id]||null,
    createElement:()=>({dataset:{},setAttribute(){},querySelector(){return{disabled:false};}}),
    body
  };
  const D={products:[{id:'p1',name:'Barang',stock:0,preorder:{aktif:true,kuota:5}}]};
  let created=null,opened='';
  const Preorder={quota:()=>({sisa:5,kuota:5}),create:o=>(created=o,{ok:true,preorder:{id:'po1'}}),renderPanel(){}};
  const ctx=loadSource(['modules/business/kasir.js'],{
    D,document,window:{},Preorder,escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,
    toast(){},openModal:id=>{opened=id;},closeModal(){}
  },['Kasir']);
  ctx.Kasir.openPreorderForm('p1');
  nodes.kasirPoName.value='Budi';nodes.kasirPoPhone.value='0812';nodes.kasirPoQty.value='2';nodes.kasirPoNote.value='Merah';
  ctx.Kasir.submitPreorderForm();
  assert.equal(opened,'kasirPreorderModal');
  assert.equal(created.productId,'p1');
  assert.equal(created.customer.name,'Budi');assert.equal(created.customer.phone,'0812');
  assert.equal(created.qty,2);
  assert.equal(created.note,'Merah');
  assert.ok(created.idempotencyKey);
});

test('P3.a: nilai kasirDP dikirim utuh ke syncShopSalePayment walau UI menampilkan kembalian',()=>{
  const vals={kasirAcc:{value:'a1'},kasirCustName:{value:'Budi'},kasirCustPhone:{value:''},kasirCustAddr:{value:''},kasirDelivered:{checked:true},kasirNote:{value:''},kasirDP:{value:'150'},kasirCartList:{},kasirSubDisplay:{},kasirTotalDisplay:{},kasirProfitDisplay:{},kasirCheckoutBtn:{},kasirFloatbar:{classList:{toggle(){}}},kasirFloatCount:{},kasirFloatTotal:{},kasirChangeRow:{style:{}},kasirChangeDisplay:{},kasirDiskonRow:{style:{}},kasirOngkirRow:{style:{}}};
  const document={getElementById:id=>vals[id]||null,querySelectorAll:()=>[]};
  const D={products:[],accounts:[{id:'a1',name:'Kas'}],transactions:[],cobek:[],piutang:[],profile:{}};
  let sent=null;
  const ctx=loadSource(['modules/business/kasir.js'],{
    D,document,window:{},escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFull:n=>'Rp'+n,fmtFullSigned:n=>'Rp'+n,
    uid:()=> 'tx1',todayStr:()=> '2026-11-01',toast(){},recordShopSale:o=>{D.cobek.push({id:'shop1',items:o.items,total:o.total});return{ok:true,shopId:'shop1'};},
    syncShopSalePayment:o=>{sent=o;return{ok:true,dp:100,sisa:0};},save(){return true;},
    renderProductList(){},renderShop(){},Order:{renderRecent(){}},renderSiapPulang(){},refreshAfterMutation(){},renderSiapPulang(){},
  },['Kasir']);
  ctx.Kasir.cart=[{productId:'p1',qty:1,hargaOverride:null}];
  ctx.Kasir.reset=()=>{};
  D.products.push({id:'p1',name:'Barang',stock:2,hargaJual:100,hargaBeli:50});
  ctx.Kasir.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:1,harga:100,lineTotal:100}],subtotal:100,diskonEfektif:0,ongkir:0,total:100,profit:50});
  ctx.Kasir._checkoutInner();
  assert.equal(sent.dpRaw,'150');
  assert.equal(sent.total,100);
  assert.equal(ctx.Kasir.lastReceipt.change,50);
});
