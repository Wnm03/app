'use strict';
// S1990: canonical service cost + checklist->service context sync + manual item toggle.
// Runtime tests (vm harness loads servis.js + servis-b.js transparently).
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function makeEl(extra){return Object.assign({value:'',style:{},textContent:'',focused:false,scrolled:false,focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}},extra||{});}
// Harness memuat servis-checklist.js asli (const ServisChecklist), jadi stub global tidak bisa
// menimpa; method pada objek asli ditimpa per-test lewat `checklist`. undefined = matikan costSummary.
function load(globals,checklist){
  const c=loadSource(['modules/vehicle/servis.js'],Object.assign({D:{servisLogs:[],transactions:[]},curVehicleId:'v1'},globals||{}),['Servis','ServisChecklist']);
  if(checklist===undefined){c.ServisChecklist.costSummary=undefined;c.ServisChecklist.toLogPayload=undefined;c.ServisChecklist._checked=undefined;}
  else Object.assign(c.ServisChecklist,checklist);
  return c;
}
const S=(c)=>c.Servis;
const J=(v)=>JSON.parse(JSON.stringify(v));

test('S1990 getCanonicalServiceCost: tanpa ServisChecklist -> nol dengan source service_entry',()=>{
  const c=load({},undefined);
  const r=S(c).getCanonicalServiceCost();
  assert.equal(r.total,0);assert.equal(r.source,'service_entry');assert.deepEqual(J(r.byComponent),[]);
  ['labor','parts','consumables','other'].forEach(k=>assert.equal(r[k],0));
});

test('S1990 getCanonicalServiceCost: memetakan costSummary + byComponent dari toLogPayload',()=>{
  const ServisChecklist={
    costSummary:()=>({labor:10000,parts:20000,consumables:5000,other:1000,total:36000}),
    toLogPayload:()=>[{itemId:'i1',itemName:'Oli',serviceComponentId:'c1',costBreakdown:{labor:10000,parts:20000,consumables:5000,other:1000,total:36000}},{itemId:'i2'}],
  };
  const r=S(load({},ServisChecklist)).getCanonicalServiceCost();
  assert.equal(r.total,36000);assert.equal(r.source,'component');
  assert.equal(r.byComponent.length,2);
  assert.equal(r.byComponent[0].serviceComponentId,'c1');
  assert.equal(r.byComponent[1].itemName,'');
  assert.deepEqual(J(r.byComponent[1].costBreakdown),{labor:0,parts:0,consumables:0,other:0,total:0});
});

test('S1990 validateCanonicalServiceCost: konsisten -> OK',()=>{
  const r=S(load()).validateCanonicalServiceCost({labor:1,parts:2,consumables:3,other:4,total:10});
  assert.equal(r.ok,true);assert.equal(r.code,'OK');assert.equal(r.difference,0);assert.equal(r.componentsSum,10);
});

test('S1990 validateCanonicalServiceCost: total tidak cocok -> SERVICE_COST_TOTAL_MISMATCH',()=>{
  const r=S(load()).validateCanonicalServiceCost({labor:1,parts:2,consumables:3,other:4,total:15});
  assert.equal(r.ok,false);assert.equal(r.code,'SERVICE_COST_TOTAL_MISMATCH');assert.equal(r.difference,5);
});

test('S1990 validateCanonicalServiceCost: nilai negatif atau NaN ditolak',()=>{
  const s=S(load());
  assert.equal(s.validateCanonicalServiceCost({labor:-1,parts:1,consumables:0,other:0,total:0}).ok,false);
  assert.equal(s.validateCanonicalServiceCost({labor:1,parts:0,consumables:0,other:0,total:'abc'}).ok,false);
});

test('S1990 validateCanonicalServiceCost: toleransi selisih < 0.005 dan default ke summary kanonik',()=>{
  const s=S(load({},undefined));
  assert.equal(s.validateCanonicalServiceCost({labor:1,parts:0,consumables:0,other:0,total:1.004}).ok,true);
  assert.equal(s.validateCanonicalServiceCost({labor:1,parts:0,consumables:0,other:0,total:1.5}).ok,false);
  assert.equal(s.validateCanonicalServiceCost({labor:1,parts:0,consumables:0,other:0,total:1.01}).ok,false);
  assert.equal(s.validateCanonicalServiceCost().ok,true);
});

test('S1990 _parseLegacyServiceCost: kosong=0, angka diparse eksplisit, invalid jadi NaN',()=>{
  const s=S(load());
  assert.equal(s._parseLegacyServiceCost(''),0);
  assert.equal(s._parseLegacyServiceCost('15000'),15000);
  assert.equal(s._parseLegacyServiceCost('-5'),-5);
  assert.ok(Number.isNaN(s._parseLegacyServiceCost('abc')));
});

test('S1990 setManualServiceItemVisible: tampil/sembunyi + label tombol + fokus',()=>{
  const wrap=makeEl({style:{display:'none'}}),btn=makeEl(),item=makeEl();
  const c=load({document:{getElementById:id=>({servisManualItemWrap:wrap,servisManualItemBtn:btn,servisItem:item})[id]||null}});
  S(c).setManualServiceItemVisible(true,true);
  assert.equal(wrap.style.display,'');assert.match(btn.textContent,/Sembunyikan item manual/);
  assert.equal(item.focused,true);assert.equal(item.scrolled,true);
  S(c).setManualServiceItemVisible(false);
  assert.equal(wrap.style.display,'none');assert.match(btn.textContent,/Item manual\/non-standar/);
});

test('S1990 setManualServiceItemVisible: aman tanpa elemen DOM',()=>{
  const c=load({document:{getElementById:()=>null}});
  assert.doesNotThrow(()=>S(c).setManualServiceItemVisible(true,true));
});

test('S1990 toggleManualServiceItem: membalik state tampil/sembunyi',()=>{
  const wrap=makeEl({style:{display:'none'}}),btn=makeEl(),item=makeEl();
  const c=load({document:{getElementById:id=>({servisManualItemWrap:wrap,servisManualItemBtn:btn,servisItem:item})[id]||null}});
  S(c).toggleManualServiceItem();assert.equal(wrap.style.display,'');
  S(c).toggleManualServiceItem();assert.equal(wrap.style.display,'none');
});

function ctxFor(checklist){
  const els={servisItem:makeEl(),servisCategory:makeEl(),servisComponent:makeEl(),servisCategorySot:makeEl(),servisComponentSot:makeEl(),servisActionType:makeEl(),servisConditionResult:makeEl(),servisConditionNote:makeEl()};
  const c=load({document:{getElementById:id=>els[id]||null}},checklist);
  const calls=[];
  S(c).setEditCanonicalSelection=(cat,comp)=>calls.push(['sel',cat,comp]);
  S(c).syncVisibleServiceSotSelectors=()=>calls.push(['vis']);
  return {c,els,calls};
}

test('S1990 syncServiceContextFromChecklist: mengisi field servis dari item checklist pertama',()=>{
  const checklist={
    _checked:{i1:'ganti'},_results:{i1:'aus'},_conditionNotes:{i1:'catatan tes'},
    findItemById:()=>({item:{name:'Oli mesin',id:'comp-fallback'},group:{masterCategoryId:'cat-group'}}),
    getItemIdentity:()=>({masterCategoryId:'cat-1',serviceComponentId:'comp-1'}),
  };
  const {c,els,calls}=ctxFor(checklist);
  assert.equal(S(c).syncServiceContextFromChecklist(),true);
  assert.equal(els.servisItem.value,'Oli mesin');
  assert.equal(els.servisCategory.value,'cat-1');assert.equal(els.servisComponent.value,'comp-1');
  assert.equal(els.servisCategorySot.value,'cat-1');assert.equal(els.servisComponentSot.value,'comp-1');
  assert.equal(els.servisActionType.value,'ganti');
  assert.equal(els.servisConditionResult.value,'aus');assert.equal(els.servisConditionNote.value,'catatan tes');
  assert.deepEqual(J(calls),[['sel','cat-1','comp-1'],['vis']]);
});

test('S1990 syncServiceContextFromChecklist: fallback ke id item & kategori grup bila identity kosong',()=>{
  const checklist={_checked:{i1:'periksa'},findItemById:()=>({item:{name:'Kampas',id:'comp-x'},group:{masterCategoryId:'cat-g'}}),getItemIdentity:()=>({})};
  const {c,els}=ctxFor(checklist);
  assert.equal(S(c).syncServiceContextFromChecklist(),true);
  assert.equal(els.servisComponent.value,'comp-x');assert.equal(els.servisCategory.value,'cat-g');
  assert.equal(els.servisConditionResult.value,'');assert.equal(els.servisConditionNote.value,'');
});

test('S1990 syncServiceContextFromChecklist: false bila tidak ada checklist/centang/item',()=>{
  assert.equal(S(ctxFor(undefined).c).syncServiceContextFromChecklist(),false);
  assert.equal(S(ctxFor({_checked:{}}).c).syncServiceContextFromChecklist(),false);
  assert.equal(S(ctxFor({_checked:{i1:'ganti'},findItemById:()=>null}).c).syncServiceContextFromChecklist(),false);
});

test('S1990 kontrak: modal Edit/Create menjaga urutan sync checklist -> openModal',()=>{
  const {readServisSource}=require('./helpers/carNotesSource');
  const src=readServisSource();
  assert.match(src,/Servis\.syncServiceChecklist\(\);\s*openModal\('servisModal'\)/);
  assert.match(src,/const legacyCost=Servis\._parseLegacyServiceCost\(costRaw\)/);
});
