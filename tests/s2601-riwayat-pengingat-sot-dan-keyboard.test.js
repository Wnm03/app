'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');

function method(name){
  const i=servis.indexOf('\n'+name+'(');
  assert.ok(i>=0,'method '+name+' tidak ditemukan');
  let j=servis.indexOf('{',i),d=0,k=j;
  for(;k<servis.length;k++){if(servis[k]==='{')d++;else if(servis[k]==='}'){d--;if(!d)break;}}
  return servis.slice(i+1,k+1);
}
function build(name,ctx){
  const src=method(name);
  return new Function(...Object.keys(ctx),'return ({'+src+'})["'+name+'"];')(...Object.values(ctx));
}

test('S2601: input interval/qty stok TIDAK render ulang saat mengetik (keyboard tetap terbuka)',()=>{
  for(const [name,setter] of [['setServiceChecklistInterval','setIntervalOverride'],['setServiceChecklistStockQty','setStockPartRef']]){
    let renders=0,toasts=0,saved=[];
    const ServisChecklist={_item:()=>({id:'it1'}),getStockPartRef:()=>({partId:'p1'}),[setter]:(...a)=>{saved.push(a);return {ok:false,reason:'x'};}};
    const Servis={renderServiceChecklist:()=>{renders++;}};
    const fn=build(name,{ServisChecklist,Servis,toast:()=>{toasts++;}});
    fn(0,0,'1');fn(0,0,'12');fn(0,0,'120');
    assert.equal(renders,0,name+': tidak boleh render ulang per ketikan');
    assert.equal(toasts,0,name+': tidak boleh toast per ketikan');
    assert.equal(saved.length,3,name+': nilai tetap tersimpan tiap ketikan');
    fn(0,0,'120',true);
    assert.equal(renders,1,name+': render ulang hanya saat commit (change/blur)');
  }
});

test('S2601: markup input interval & qty stok memasang data-onchange commit=true',()=>{
  for(const n of ['setServiceChecklistInterval','setServiceChecklistStockQty']){
    assert.ok(servis.includes('data-onchange="Servis.'+n+'"'),n+' butuh data-onchange');
    const re=new RegExp('data-onchange="Servis\\.'+n+'" data-onchange-args="\\$\\{escapeHtml\\(JSON\\.stringify\\(\\[gi,ii,\'\\$value\',true\\]\\)\\)\\}"');
    assert.match(servis,re,n+' commit arg true');
  }
});

test('S2601: tab Riwayat memakai predikat yang sama dengan kartu Pengingat',()=>{
  assert.match(servis,/ServiceHistoryReminderReconciliationSOT\.ownsLog\(log,effectiveComponentFilter,vehicleKey\)/);
});

test('S2601: log hanya-master dihitung pengingat; riwayat kini menyertakannya (hitungan sama)',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  const I=require('../modules/vehicle/service-history-component-identity-sot.js');
  global.ServiceInputCatalog={itemById:id=>id==='v-belt-cvt'?{item:{id,masterCategoryId:'servis-cvt'},group:{masterCategoryId:'servis-cvt'}}:null,infer:()=>null};
  const cat={id:'c1',name:'V-Belt CVT',masterCategoryId:'servis-cvt',serviceComponentId:'v-belt-cvt',vehicleId:'v1'};
  const logs=[
    {id:'a',vehicleId:'v1',date:'2025-10-13',km:7608,serviceComponentId:'v-belt-cvt',masterCategoryId:'servis-cvt',actionType:'ganti'},
    {id:'b',vehicleId:'v1',date:'2025-11-24',km:8685,serviceComponentId:'v-belt-cvt',masterCategoryId:'servis-cvt',actionType:'periksa'},
    {id:'c',vehicleId:'v1',date:'2026-05-08',km:14867,masterCategoryId:'servis-cvt',item:'Servis CVT',actionType:'ganti'}
  ];
  const card=logs.filter(l=>S.match(l,cat,{vehicleId:'v1'}).ok).map(l=>l.id);
  const oldHistory=logs.filter(l=>String(I.resolve(l,{componentId:'v-belt-cvt'}).serviceComponentId||'')==='v-belt-cvt').map(l=>l.id);
  // S2728: log hanya-master (tanpa serviceComponentId, teks bebas) TIDAK lagi menjadi bukti kartu
  // berkomponen; hanya kartu lama tanpa komponen yang boleh cocok lewat induk.
  assert.deepEqual(card,['a','b'],'kartu berkomponen tidak menghitung log hanya-master (S2728)');
  assert.deepEqual(oldHistory,['a','b'],'riwayat berbasis identitas komponen: 2');
  const newHistory=logs.filter(l=>String(I.resolve(l,{componentId:'v-belt-cvt'}).serviceComponentId||'')==='v-belt-cvt'||S.match(l,cat,{vehicleId:'v1'}).ok).map(l=>l.id);
  assert.deepEqual(newHistory,card,'riwayat sekarang == pengingat');
  delete global.ServiceInputCatalog;
});

test('S2601: ownsLog == servisLogMatchesCat (kartu) untuk setiap bentuk log; kendaraan lain ditolak',()=>{
  const S=require('../modules/vehicle/service-history-reminder-reconciliation-sot.js');
  global.ServiceInputCatalog={itemById:id=>id==='v-belt-cvt'?{item:{id,masterCategoryId:'servis-cvt'},group:{masterCategoryId:'servis-cvt'}}:null,infer:()=>null};
  const cat={id:'c1',name:'V-Belt CVT',masterCategoryId:'servis-cvt',serviceComponentId:'v-belt-cvt',vehicleId:'v1'};
  global.D={sparepartCats:[cat]};
  global.servisLogMatchesCat=(l,c)=>S.match(l,c,{vehicleId:l&&l.vehicleId}).ok;
  const logs=[
    {id:'a',vehicleId:'v1',serviceComponentId:'v-belt-cvt',masterCategoryId:'servis-cvt'},
    {id:'c',vehicleId:'v1',masterCategoryId:'servis-cvt',item:'Servis CVT'},
    {id:'d',vehicleId:'v1',serviceComponentId:'roller-cvt',masterCategoryId:'servis-cvt'},
    {id:'e',vehicleId:'v2',serviceComponentId:'v-belt-cvt',masterCategoryId:'servis-cvt'},
    {id:'f',vehicleId:'v1',masterCategoryId:'lain',item:'Oli'}
  ];
  for(const l of logs)assert.equal(S.ownsLog(l,'v-belt-cvt','v1'),!!global.servisLogMatchesCat(l,cat)&&l.vehicleId==='v1',l.id);
  assert.equal(S.ownsLog(logs[1],'v-belt-cvt','v1'),false,'S2728: log hanya-master bukan milik kartu berkomponen');
  assert.equal(S.ownsLog(logs[2],'v-belt-cvt','v1'),false);
  delete global.ServiceInputCatalog;delete global.D;delete global.servisLogMatchesCat;
});
