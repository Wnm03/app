'use strict';
// S1963 — Shop active-tab SOT / Kasir AI routing regression.
// Invariant: requested Shop tab, highlighted .cn-tab, visible pane, and
// render-owner state all refer to the same tab, regardless of a stale/wrong
// button element supplied by a legacy caller.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.join(__dirname,'..');

function extractFunction(file,fnName,extra={}){
  const src=fs.readFileSync(path.join(ROOT,file),'utf8');
  const marker=`function ${fnName}(`;
  const start=src.indexOf(marker); assert.notEqual(start,-1,`${fnName} tidak ditemukan`);
  const brace=src.indexOf('{',start); let depth=1,i=brace+1;
  while(i<src.length&&depth){if(src[i]==='{')depth++;else if(src[i]==='}')depth--;i++;}
  const sandbox={console,...extra};
  vm.createContext(sandbox);
  new vm.Script(`${src.slice(start,i)}\nthis.__fn=${fnName};`).runInContext(sandbox);
  return sandbox.__fn;
}

function makeEl(name){
  const e={name,style:{},dataset:{},_c:new Set(),_attrs:{}};
  e.classList={add:c=>e._c.add(c),remove:c=>e._c.delete(c),contains:c=>e._c.has(c),toggle:(c,on)=>on?e._c.add(c):e._c.delete(c)};
  e.getAttribute=k=>e._attrs[k]??null;
  e.setAttribute=(k,v)=>{e._attrs[k]=String(v);};
  return e;
}

function makeDom(){
  const names=['kasir','jual','etalase','produsen','riwayat','pelanggan','laporan','bi'];
  const buttons=names.map(makeEl);
  const panes=Object.fromEntries(names.map(n=>['shopTab-'+n,makeEl('shopTab-'+n)]));
  const page=makeEl('page-shop'); page.dataset={};
  const byId={'page-shop':page,'shopBreadcrumbSub':makeEl('shopBreadcrumbSub'),...panes};
  const document={
    getElementById:id=>byId[id]||null,
    querySelectorAll:sel=>sel==='#page-shop .cn-tab'?buttons:[],
    querySelector:()=>null,
  };
  return {document,names,buttons,panes,page,byId};
}

test('S1963: setShopTab menjadikan t sebagai SOT dan mengabaikan tombol legacy yang salah index',()=>{
  const d=makeDom();
  const noop=()=>{};
  const fn=extractFunction('modules/shop/cobek-io.js','setShopTab',{
    document:d.document,SHOP_TAB_LABEL:{kasir:'Kasir AI',jual:'Manual',etalase:'Etalase',produsen:'Produsen',riwayat:'Riwayat',pelanggan:'Pelanggan',laporan:'Laporan',bi:'Business Intelligence'},dismissAllToasts:noop,scrollTabBarIntoView:noop,
    Kasir:{render:noop},renderProductList:noop,renderProdusenList:noop,
    renderShop:noop,renderShopGrafik:noop,renderShopRecent:noop,
    renderCustomerList:noop,Laporan:{renderTab:noop},PWAUX:{markRendered:noop}
  });
  for(let i=0;i<d.names.length;i++){
    d.buttons.forEach(b=>b.classList.remove('active'));
    const wrong=d.buttons[(i+1)%d.buttons.length];
    fn(d.names[i],wrong);
    assert.equal(d.page.dataset.activeShopTab,d.names[i]);
    assert.equal(d.buttons[i].classList.contains('active'),true,d.names[i]+' tombol canonical harus aktif');
    assert.equal(wrong===d.buttons[i]||wrong.classList.contains('active'),wrong===d.buttons[i],d.names[i]+' tombol stale tidak boleh aktif');
    d.names.forEach((n,j)=>assert.equal(d.panes['shopTab-'+n].classList.contains('u-dnone'),j!==i));
  }
});

test('S1963: getActivePageTab membaca state Shop canonical sebelum class active',()=>{
  const d=makeDom();
  d.page.dataset.activeShopTab='bi';
  d.buttons[0].classList.add('active');
  const fn=extractFunction('modules/shared/modules-render-b.js','getActivePageTab',{document:d.document});
  assert.equal(fn('page-shop','kasir'),'bi');
});

test('S1963: quick actions tidak lagi membawa index tombol stale',()=>{
  const src=fs.readFileSync(path.join(ROOT,'modules/shared/action-wrappers.js'),'utf8');
  assert.match(src,/function qsShopLihatEtalase\(\)\{ closeQS\('qsShop'\); setShopTab\('etalase'\); \}/);
  assert.match(src,/function qsShopRiwayat\(\)\{ closeQS\('qsShop'\); setShopTab\('riwayat'\); \}/);
  assert.doesNotMatch(src,/qsShopLihatEtalase\(\).*querySelectorAll\('#page-shop \.cn-tab'\)\[1\]/s);
  assert.doesNotMatch(src,/qsShopRiwayat\(\).*querySelectorAll\('#page-shop \.cn-tab'\)\[3\]/s);
});

test('S1963: seluruh Shop entry point yang memanggil setShopTab menggunakan canonical tab name',()=>{
  const files=['modules/finance/filter-laporan.js','modules/shared/modules-calc.js','modules/shared/action-wrappers.js','modules/shared/modal-navigasi.js','modules/dashboard-hub/dashboard-hub.js'];
  const all=files.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
  const bad=/setShopTab\((['"])(kasir|jual|etalase|produsen|riwayat|pelanggan|laporan|bi)\1\s*,\s*document\.querySelectorAll\('#page-shop \.cn-tab'\)\[(\d+)\]/g;
  let m; while((m=bad.exec(all))) assert.fail(`caller masih mengirim index DOM raw: ${m[0]}`);
  assert.match(all,/setShopTab\(tab,null\)/); // modal routing tetap memakai nama tab
  assert.match(all,/setShopTab\('etalase'\);/);
  assert.match(all,/setShopTab\('riwayat'\);/);
});
