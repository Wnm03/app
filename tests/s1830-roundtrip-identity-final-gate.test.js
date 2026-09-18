const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

function loadShop(overrides = {}) {
  const src = fs.readFileSync('modules/business/shop-data-io-api.js', 'utf8');
  const products = overrides.products || [];
  const produsen = overrides.produsen || [];
  const ctx = {
    console, D: { products, produsen }, SCHEMA_VERSION: 1,
    Blob: class { constructor(parts, opts){ this.parts=parts; this.opts=opts; } },
    URL: { createObjectURL(){ return 'blob:test'; } },
    document: { createElement(){ return { click(){}, set href(v){}, set download(v){} }; }, getElementById(){return null;} },
    uid: (()=>{let n=0; return ()=>++n;})(),
    save(){},
    resolveShopKategori(){ return ''; },
    escapeHtml(s){return String(s);},
  };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.__ShopDataIO=ShopDataIO;', ctx);
  return { io: ctx.__ShopDataIO, D: ctx.D };
}

test('S1830: Shop JSON import mempertahankan product.id saat membuat record baru', () => {
  const {io,D}=loadShop();
  const r=io.importShopJSON({products:[{id:'prod-stable-1',name:'Oli A',stock:2}],produsen:[]},'gabung');
  assert.equal(r.created,1);
  assert.equal(D.products[0].id,'prod-stable-1');
});

test('S1830: re-import JSON yang sama update berdasarkan product.id, bukan menggandakan', () => {
  const {io,D}=loadShop({products:[{id:'prod-stable-1',name:'Oli Lama',stock:1}]});
  const r=io.importShopJSON({products:[{id:'prod-stable-1',name:'Oli Baru',stock:5}],produsen:[]},'gabung');
  assert.equal(r.created,0); assert.equal(r.updated,1);
  assert.equal(D.products.length,1); assert.equal(D.products[0].id,'prod-stable-1'); assert.equal(D.products[0].stock,5);
});

test('S1830: identity conflict product tidak ditebak/di-merge berdasarkan nama', () => {
  const {io,D}=loadShop({products:[{id:'prod-current',name:'Oli A',stock:1}]});
  const r=io.importShopJSON({products:[{id:'prod-source',name:'Oli A',stock:9}],produsen:[]},'gabung');
  assert.equal(r.created,0); assert.equal(r.updated,0); assert.equal(D.products[0].id,'prod-current'); assert.equal(D.products[0].stock,1);
});

test('S1830: supplier id dipertahankan dan re-import tidak duplicate', () => {
  const {io,D}=loadShop();
  let r=io.importShopJSON({products:[],produsen:[{id:'sup-1',name:'Supplier A'}]},'gabung');
  assert.equal(r.produsenCreated,1); assert.equal(D.produsen[0].id,'sup-1');
  r=io.importShopJSON({products:[],produsen:[{id:'sup-1',name:'Supplier A'}]},'gabung');
  assert.equal(r.produsenCreated,0); assert.equal(D.produsen.length,1);
});

test('S1830: Shop export payload membawa stable identity product/supplier', () => {
  const {io}=loadShop({products:[{id:'p1',name:'A'}],produsen:[{id:'s1',name:'S'}]});
  const payload=io.exportShopJSON();
  assert.equal(payload.products[0].id,'p1'); assert.equal(payload.produsen[0].id,'s1');
});
