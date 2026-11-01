'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('A: stok 0 hanya menampilkan Habis; stok 1/2/6 tetap memakai label status normal',()=>{
  const productList={innerHTML:''};
  const D={products:[0,1,2,6].map((stock,i)=>({id:'p'+i,name:'P'+stock,stock,hargaJual:100,hargaBeli:50,hargaReseller:null,diskonPersen:0,beratPerUnit:1})),produsen:[],cobekKategori:[],inventoryTransfers:[],deliveryPlans:[]};
  const ctx=loadSource(['modules/shop/cobek-etalase.js'],{
    D,document:{getElementById:id=>id==='productList'?productList:null},
    InventoryService:{stockStatus:p=>({cls:p.stock<=2?'low':p.stock<=5?'mid':'ok',label:p.stock<=2?'Menipis':p.stock<=5?'Terbatas':'Aman'})},
    InventoryEngine:{stockAvailabilityStatus:p=>({status:Number(p.stock)<=0?'out':'available'})},
    fmt:n=>'Rp'+n,escapeHtml:s=>String(s??''),shopKategoriName:()=>'',console
  },['Etalase']);
  ctx.Etalase.renderFilterToolbar=()=>{};
  ctx.Etalase.renderList();
  const html=productList.innerHTML;
  const zero=html.match(/shop-product-name">P0[\s\S]*?<\/div>/)?.[0]||'';
  assert.match(zero,/P0/);
  assert.match(html,/shop-stock-pill low">Habis/);
  assert.doesNotMatch(html,/shop-stock-pill low">0 pcs · Menipis/);
  assert.match(html,/shop-stock-pill low">1 pcs · Menipis/);
  assert.match(html,/shop-stock-pill low">2 pcs · Menipis/);
  assert.match(html,/shop-stock-pill ok">6 pcs · Aman/);
});

test('B: empat ShopCanonicalWriter.create beruntun pada milidetik sama menghasilkan ID unik',()=>{
  const D={products:[]},fixed=1770000000123;
  const ctx=loadSource(['modules/shop/generic/product-repository.js','modules/shop/shop-canonical-writer.js'],{
    D,Date:{now:()=>fixed},OwnershipEngine:{resolve:()=>({type:'SELF'})}
  },['ProductRepository','ShopCanonicalWriter']);
  const made=Array.from({length:4},(_,i)=>ctx.ShopCanonicalWriter.create({name:'P'+i}));
  assert.ok(made.every(x=>x.ok));
  const ids=made.map(x=>x.product.id);
  assert.equal(new Set(ids).size,4);
  assert.equal(ids[0],'prod_'+fixed);
  assert.ok(ids.every(id=>id.startsWith('prod_')));
  assert.equal(ctx.ShopCanonicalWriter.create({id:'legacy-custom',name:'Legacy'}).product.id,'legacy-custom');
});

test('C: badge Etalase hanya menghitung preorder terbuka',()=>{
  const badge={textContent:'',style:{}};
  const D={products:[],preorders:[
    {id:'a',status:'open',qty:2},{id:'b',status:'open',qty:1},
    {id:'c',status:'fulfilled',qty:4},{id:'d',status:'cancelled',qty:1}
  ]};
  const ctx=loadSource(['modules/shop/preorder.js'],{D,document:{getElementById:id=>id==='shopPreorderTabBadge'?badge:null}},['Preorder']);
  ctx.Preorder.refreshTabBadge();
  assert.equal(badge.textContent,'Preorder (2 terbuka)');
  assert.equal(badge.style.display,'inline-flex');
});

test('D: riwayat memberi badge dari preorder hanya pada shopId fulfilled yang cocok',()=>{
  const D={preorders:[{id:'po1',status:'fulfilled',shopId:'sale1'},{id:'po2',status:'open',shopId:null}]};
  const ctx=loadSource(['modules/shop/preorder.js','modules/shop/cobek-order.js'],{
    D,escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,fmtFullSigned:n=>String(n)
  },['Order']);
  const fulfilled=ctx.Order.rowHTML({id:'sale1',items:[{name:'A',qty:1}],total:100,date:'2026-11-01',customer:{}});
  const normal=ctx.Order.rowHTML({id:'sale2',items:[{name:'B',qty:1}],total:100,date:'2026-11-01',customer:{}});
  assert.match(fulfilled,/dari preorder/);
  assert.doesNotMatch(normal,/dari preorder/);
});

test('E: retur tetap Laporan.delete, konfirmasi menjelaskan seluruh efek dan preorder dibuka kembali',async()=>{
  const D={cobek:[{id:'sale1',items:[{productId:'p1',qty:2}],txLinkId:'tx1',piutangLinkId:'pi1'}],transactions:[{id:'tx1'}],piutang:[{id:'pi1'}]};
  let confirmation='',rollback=0,removedTx=0,removedPiutang=0,preorderRemoved=0;
  const ctx=loadSource(['modules/shop/cobek-order.js'],{
    D,askConfirm:async msg=>(confirmation=msg,true),rollbackShopItems(){rollback++;},
    FinanceTxSOT:{removeById(){removedTx++;}},
    BillDebtPiutangCanonicalWriter:{removeById(){removedPiutang++;}},
    Preorder:{onSaleRemoved(id){assert.equal(id,'sale1');preorderRemoved++;}},
    save(){return true;},toast(){},renderShopRecent(){},renderProductList(){},
    syncPiutangFinanceViews(){},ShopInsight:{render(){}},BusinessFlowPresenter:{renderTab(){}}
  },['Laporan']);
  ctx.Laporan.render=()=>{};
  await ctx.Laporan.delete('sale1');
  assert.ok(confirmation.includes('Retur/Batalkan transaksi'));
  assert.match(confirmation,/Stok produk akan dikembalikan/);
  assert.match(confirmation,/piutang terkait dihapus/);
  assert.match(confirmation,/preorder.*kembali berstatus terbuka/);
  assert.equal(rollback,1);assert.equal(removedTx,1);assert.equal(removedPiutang,1);
  assert.equal(preorderRemoved,1);assert.equal(D.cobek.length,0);
});

test('F: tahan/pulihkan keranjang lokal, validasi produk dan stok saat dipulihkan',()=>{
  const store=new Map(),messages=[];
  const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  const D={products:[{id:'p1',stock:5},{id:'p2',stock:1}]};
  const ctx=loadSource(['modules/business/kasir.js'],{
    D,localStorage,toast:m=>messages.push(m),escapeHtml:s=>String(s??''),
    document:{getElementById:()=>null},window:{},Date:{now:()=>1234}
  },['Kasir']);
  ctx.Kasir.renderGrid=()=>{};ctx.Kasir.renderCart=()=>{};
  ctx.Kasir.cart=[{productId:'p1',qty:2,hargaOverride:null},{productId:'p2',qty:2,hargaOverride:50},{productId:'deleted-product',qty:1,hargaOverride:null}];
  ctx.Kasir.holdCart();
  assert.equal(ctx.Kasir.cart.length,0);
  assert.equal(ctx.Kasir.readHeldCarts().length,1);
  ctx.Kasir.restoreHeldCart(ctx.Kasir.readHeldCarts()[0].id);
  assert.deepEqual(Array.from(ctx.Kasir.cart,x=>[x.productId,x.qty]),[['p1',2]]);
  assert.match(messages.at(-1),/2 item dibuang/);
  assert.equal(ctx.Kasir.readHeldCarts().length,0);
});

test('F: maksimal lima keranjang parkir tersimpan per perangkat',()=>{
  const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  const ctx=loadSource(['modules/business/kasir.js'],{D:{products:[]},localStorage,document:{getElementById:()=>null},window:{}},['Kasir']);
  const rows=Array.from({length:7},(_,i)=>({id:'h'+i,items:[{productId:'p',qty:1}]}));
  assert.equal(ctx.Kasir.writeHeldCarts(rows),true);
  assert.deepEqual(Array.from(ctx.Kasir.readHeldCarts(),x=>x.id),['h2','h3','h4','h5','h6']);
});

test('H: rekap harian membaca data tersimpan dan tidak memutasi D',()=>{
  const D={
    cobek:[{id:'sale1',date:'2026-11-01',total:1000,accountId:'a1',txLinkId:'tx1',piutangLinkId:'p1'},{id:'sale2',date:'2026-11-01',total:500,accountId:'',txLinkId:null}],
    transactions:[{id:'tx1',cobekLinkId:'sale1',amount:250,accountId:'a1',payMethod:'tunai'}],
    accounts:[{id:'a1',name:'Kas Utama'}],piutang:[{id:'p1',nilai:750,lunas:false}]
  };
  const before=JSON.stringify(D);
  const ctx=loadSource(['modules/business/kasir.js'],{D,document:{getElementById:()=>null},window:{}},['Kasir']);
  const recap=ctx.Kasir.dailyRecap('2026-11-01');
  assert.equal(recap.count,2);assert.equal(recap.total,1500);
  assert.equal(recap.received,250);assert.equal(recap.dp,250);assert.equal(recap.receivable,750);
  assert.equal(recap.groups[0].method,'tunai');
  assert.equal(recap.groups[1].method,'Tidak tercatat');
  assert.equal(JSON.stringify(D),before);
});
