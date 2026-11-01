'use strict';
// Menguji perilaku Etalase lewat DISPATCHER ASLI (_dataActionInputChangeHandler dari
// features-helpers-global-security.js), bukan memanggil Etalase.setSort() langsung.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {loadSource}=require('./helpers/loadSource');

function loadDispatcher(win){
  const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/features-helpers-global-security.js'),'utf8');
  const a=src.indexOf('function _dataActionResolveArgs(');
  const b=src.indexOf("document.addEventListener('input', _dataActionInputChangeHandler");
  assert.ok(a>0&&b>a,'dispatcher asli tidak ditemukan');
  const ctx=vm.createContext({window:win,document:{querySelectorAll:()=>[]},console:{error(){throw new Error('dispatcher error: '+[].join.call(arguments,' '))},debug(){}},toast(m){throw new Error('toast: '+m);}});
  vm.runInContext(src.slice(a,b)+'\nthis.__h=_dataActionInputChangeHandler;',ctx);
  return ctx.__h;
}
// elemen palsu dari tag HTML hasil render: dataset diambil dari atribut data-* sungguhan
function elFromTag(tag,value){
  const dataset={};
  tag.replace(/\sdata-([a-z-]+)=("([^"]*)"|'([^']*)')/g,(m,k,_v,dq,sq)=>{
    const camel=k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    dataset[camel]=(dq!==undefined?dq.replace(/&quot;/g,'"'):sq);return m;});
  const el={dataset,value};el.closest=()=>el;return el;
}
function fixture(){
  const store={};
  const mk=(id)=>store[id]||(store[id]=(function(){let html='';const o={writes:0,attrs:{},value:'',style:{},classList:{toggle(){}},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}};
    Object.defineProperty(o,'innerHTML',{get(){return html},set(v){html=v;o.writes++;}});return o;})());
  const document={getElementById:mk};
  const D={products:[{id:'p1',name:'Zebra',stock:1,hargaJual:5,hargaBeli:1},{id:'p2',name:'Alpha',stock:2,hargaJual:9,hargaBeli:1}],cobekKategori:[],produsen:[],inventoryTransfers:[],deliveryPlans:[]};
  const ctx=loadSource(['modules/shop/cobek-etalase.js'],{D,document,escapeHtml:s=>String(s??''),fmt:n=>'Rp'+n,shopKategoriName:()=>'',sameId:(a,b)=>String(a)===String(b)},['Etalase']);
  return {ctx,store,mk,D};
}

test('dropdown Urutkan: nilai sampai ke Etalase.setSort lewat dispatcher asli',()=>{
  const {ctx,store}=fixture();
  ctx.Etalase.renderList();
  const tag=store.etalaseFilterToolbar.innerHTML.match(/<select[^>]*data-onchange="Etalase\.setSort"[^>]*>/)[0];
  assert.match(tag,/data-onchange-args='\["\$value"\]'/);
  const h=loadDispatcher(ctx);
  h({type:'change',target:elFromTag(tag,'za')});
  assert.equal(ctx.Etalase.filterState.sort,'za');
  assert.ok(store.productList.innerHTML.indexOf('Zebra')<store.productList.innerHTML.indexOf('Alpha'));
  h({type:'change',target:elFromTag(tag,'az')});
  assert.equal(ctx.Etalase.filterState.sort,'az');
});

test('kolom cari tidak dibangun ulang saat mengetik (fokus keyboard aman)',()=>{
  const {ctx,store}=fixture();
  ctx.Etalase.renderList();
  const searchHost=store.etalaseFilterSearch;
  assert.equal(searchHost.writes,1);
  const tag=searchHost.innerHTML.match(/<input[^>]*>/)[0];
  assert.match(tag,/data-oninput="Etalase\.setSearch"/);
  const h=loadDispatcher(ctx);
  for(const v of ['a','al','alp']) h({type:'input',target:elFromTag(tag,v)});
  assert.equal(ctx.Etalase.filterState.search,'alp');
  assert.equal(searchHost.writes,1,'host kolom cari ditulis ulang');
  assert.ok(store.etalaseFilterToolbar.writes>=4,'chip/sort tetap dirender ulang');
  assert.doesNotMatch(store.etalaseFilterToolbar.innerHTML,/type="search"/);
});

test('reset filter mengosongkan kolom cari',()=>{
  const {ctx,store}=fixture();
  ctx.Etalase.renderList();ctx.Etalase.setSearch('x');
  store.etalaseSearchInput=store.etalaseSearchInput||{value:''};store.etalaseSearchInput.value='x';
  ctx.Etalase.resetFilters();
  assert.equal(store.etalaseSearchInput.value,'');
  assert.equal(ctx.Etalase.filterState.search,'');
});
