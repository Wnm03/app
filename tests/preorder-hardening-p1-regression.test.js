'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('Preorder.onSaleRemoved mengembalikan preorder fulfilled menjadi open secara idempoten',()=>{
  const D={products:[],preorders:[
    {id:'a',status:'fulfilled',shopId:'shop-1',fulfilledAt:10},
    {id:'b',status:'fulfilled',shopId:'shop-2',fulfilledAt:11},
    {id:'c',status:'open',shopId:null}
  ]};
  const ctx=loadSource(['modules/shop/preorder.js'],{D,save(){return true;}},['Preorder']);
  assert.equal(ctx.Preorder.onSaleRemoved('shop-1').count,1);
  assert.equal(D.preorders[0].status,'open');
  assert.equal(D.preorders[0].shopId,null);
  assert.equal('fulfilledAt' in D.preorders[0],false);
  assert.equal(ctx.Preorder.onSaleRemoved('shop-1').count,0);
  assert.equal(D.preorders[1].status,'fulfilled');
});

test('Preorder.cancelForProduct membatalkan seluruh antrean atomik dan rollback bila save gagal',()=>{
  const D={products:[],preorders:[
    {id:'a',productId:'p1',status:'open'},
    {id:'b',productId:'p1',status:'open'},
    {id:'c',productId:'p2',status:'open'}
  ]};
  let fail=false;
  const ctx=loadSource(['modules/shop/preorder.js'],{D,save(){return !fail;}},['Preorder']);
  fail=true;
  assert.equal(ctx.Preorder.cancelForProduct('p1','produk dihapus').ok,false);
  assert.deepEqual(D.preorders.slice(0,2).map(x=>x.status),['open','open']);
  fail=false;
  assert.equal(ctx.Preorder.cancelForProduct('p1','produk dihapus').count,2);
  assert.deepEqual(D.preorders.map(x=>x.status),['cancelled','cancelled','open']);
  assert.equal(D.preorders[0].cancelReason,'produk dihapus');
});

test('ProductRepository menghasilkan 4 ID unik dalam milidetik yang sama dan menerima ID unik yang diberikan',()=>{
  const D={products:[]};
  const oldNow=Date.now;
  Date.now=()=>123456789;
  try{
    const FixedDate={now:()=>123456789};
    const ctx=loadSource(['modules/shop/generic/product-repository.js'],{D,Date:FixedDate,OwnershipEngine:{resolve:()=>({type:'SELF'})}},['ProductRepository']);
    const made=[];
    for(let i=0;i<4;i++){
      const r=ctx.ProductRepository.createProduct({name:'P'+i});
      assert.equal(r.ok,true);
      made.push(r.product);
      D.products.push(r.product);
    }
    assert.equal(new Set(made.map(p=>p.id)).size,4);
    assert.equal(made[0].id,'prod_123456789');
    assert.equal(ctx.ProductRepository.createProduct({id:'custom-id',name:'Custom'}).product.id,'custom-id');
    D.products.push({id:'custom-id'});
    assert.notEqual(ctx.ProductRepository.createProduct({id:'custom-id',name:'Duplicate'}).product.id,'custom-id');
  }finally{Date.now=oldNow;}
});


test('Order rollback transaksi baru saat sync pembayaran gagal: stok, D.cobek, transaksi dan piutang kembali',()=>{
  const files=['modules/shop/cobek-tx-cart.js','modules/shop/cobek-order.js','modules/shop/preorder.js'];
  const els={};const document={getElementById:id=>els[id]||(els[id]={value:'',checked:true,innerHTML:'',style:{},classList:{toggle(){}},textContent:''})};
  const D={products:[{id:'p1',name:'Cobek',stock:5,hargaJual:50000,hargaBeli:20000}],cobek:[],accounts:[{id:'a1'}],transactions:[],piutang:[]};
  const txSot={removeById(id){D.transactions=D.transactions.filter(t=>t.id!==id);return{ok:true};}};
  const ctx=loadSource(files,{D,document,FinanceTxSOT:txSot,escapeHtml:s=>String(s??''),uid:(()=>{let n=0;return()=>'u'+(++n)})(),todayStr:()=>'2026-11-01',toast(){},save(){return true;},
    syncShopSalePayment(){return{ok:false,reason:'simulated-failure'};},openModal(){},closeModal(){},renderProductList(){},renderShop(){},renderSiapPulang(){},renderShopRecent(){},fmtFull:n=>n,fmt:n=>n,
    Etalase:{bundleAddonShape:()=>null,bracketRange:()=>null,renderModalStat(){}}},['Order','recordShopSale']);
  ctx.Order.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:2,harga:50000,lineTotal:100000}],subtotal:100000,diskonEfektif:0,ongkir:0,total:100000,profit:60000});
  ctx.Order.items=[{productId:'p1',qty:2,hargaOverride:null}];
  ctx.Order._saveInner();
  assert.equal(D.products[0].stock,5);
  assert.equal(D.cobek.length,0);
  assert.equal(D.transactions.length,0);
  assert.equal(D.piutang.length,0);
});

test('Order rollback transaksi baru saat sync pembayaran melempar exception dan preorder tidak fulfilled',()=>{
  const files=['modules/shop/cobek-tx-cart.js','modules/shop/cobek-order.js','modules/shop/preorder.js'];
  const els={};const document={getElementById:id=>els[id]||(els[id]={value:'',checked:true,innerHTML:'',style:{},classList:{toggle(){}},textContent:''})};
  const D={products:[{id:'p1',name:'Cobek',stock:5,hargaJual:50000,hargaBeli:20000}],cobek:[],accounts:[{id:'a1'}],transactions:[],piutang:[],preorders:[{id:'po1',productId:'p1',qty:2,status:'open',shopId:null}]};
  const txSot={removeById(id){D.transactions=D.transactions.filter(t=>t.id!==id);return{ok:true};}};
  const ctx=loadSource(files,{D,document,FinanceTxSOT:txSot,escapeHtml:s=>String(s??''),uid:(()=>{let n=0;return()=>'throw'+(++n)})(),todayStr:()=>'2026-11-01',toast(){},save(){return true;},
    syncShopSalePayment(){throw new Error('simulated-exception');},openModal(){},closeModal(){},renderProductList(){},renderShop(){},renderSiapPulang(){},renderShopRecent(){},fmtFull:n=>n,fmt:n=>n,
    Etalase:{bundleAddonShape:()=>null,bracketRange:()=>null,renderModalStat(){}}},['Order','recordShopSale','Preorder']);
  ctx.Order.computeTotals=()=>({lines:[{productId:'p1',product:D.products[0],qty:2,harga:50000,lineTotal:100000}],subtotal:100000,diskonEfektif:0,ongkir:0,total:100000,profit:60000});
  ctx.Order.items=[{productId:'p1',qty:2,hargaOverride:null}];ctx.Order.preorderId='po1';
  ctx.Order._saveInner();
  assert.equal(D.products[0].stock,5);
  assert.equal(D.cobek.length,0);
  assert.equal(D.transactions.length,0);
  assert.equal(D.piutang.length,0);
  assert.equal(D.preorders[0].status,'open');
  assert.equal(D.preorders[0].shopId,null);
});
