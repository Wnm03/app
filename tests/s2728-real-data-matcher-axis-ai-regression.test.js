'use strict';
// S2728: tes perilaku (bukan regex sumber) untuk pencocokan log->kategori, sumbu aksi,
// dan jalur AI. Bentuk kategori/log diturunkan dari backup nyata (tanpa data pribadi).
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

const FILES=['modules/vehicle/service-interval-policy.js','modules/vehicle/service-interval-sot.js','modules/vehicle/service-legacy-maintenance.js','modules/vehicle/service-category-sot-reconciliation-s2007.js','modules/vehicle/service-history-component-identity-sot.js','modules/vehicle/service-history-reminder-reconciliation-sot.js','modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js','ai-chat.js'];
const V='veh_1';
const CAT={
  busi:{id:'c_busi',name:'Busi',intervalKm:8000,intervalBulan:0,showInReminder:true,vehicleId:V,masterCategoryId:'servis-mesin',serviceComponentId:'busi'},
  boss:{id:'c_boss',name:'Boss Pulley & Drive Face',intervalKm:8000,intervalBulan:0,showInReminder:true,vehicleId:V,masterCategoryId:'servis-cvt',serviceComponentId:'boss-pulley-drive-face'},
  kkg:{id:'c_kkg',name:'Kampas Kopling Ganda',intervalKm:24000,intervalBulan:0,showInReminder:true,vehicleId:V,masterCategoryId:'servis-cvt',serviceComponentId:'kampas-kopling-ganda'},
  rumah:{id:'c_rumah',name:'Pembersihan Rumah CVT',intervalKm:8000,intervalBulan:0,showInReminder:true,vehicleId:V,masterCategoryId:'servis-cvt',serviceComponentId:'pembersihan-rumah-cvt'},
  legacy:{id:'c_legacy',name:'Servis Cvt',intervalKm:8000,intervalBulan:0,showInReminder:true,vehicleId:V}
};
function log(o){return Object.assign({id:String(Math.random()),vehicleId:V,date:'2026-01-01',cost:0},o);}
function comp(id,master,item,km,action,extra){
  return log(Object.assign({item,km,actionType:action,serviceComponentId:id,masterCategoryId:master,checklist:action?[{itemId:id,itemName:item,masterCategoryId:master,actionType:action,action}]:[]},extra));
}
const FREE_KORTER=log({id:'korter',item:'Korter Piston',km:5600,actionType:'ganti',masterCategoryId:'servis-mesin'});
const FREE_PULLY=log({id:'pully',item:'Tutup Pully',km:14867,actionType:'ganti',masterCategoryId:'servis-cvt'});

function rt(cats,logs){
  const D={vehicles:[{id:V,name:'Vario 125',modelId:'vario-125'}],sparepartCats:cats,servisLogs:logs};
  return {c:loadSource(FILES,{D},['computeServiceUrgency','dedupeServiceCategoriesForVehicle','aiServiceIntervalStatusText']),D};
}
const urg=(r,cat,km=21311)=>r.c.computeServiceUrgency({vehicleId:V,cat,curKm:km,kmPerDay:null,nowISO:'2026-10-18'});

test('S2728 teks bebas "Korter Piston" (ganti, tanpa komponen) tidak menjadi baseline Busi',()=>{
  const r=rt([CAT.busi],[FREE_KORTER]);
  const u=urg(r,CAT.busi);
  assert.equal(u.status,'unknown');
  assert.equal(u.lastKm??null,null);
});

test('S2728 teks bebas "Tutup Pully" (ganti, tanpa komponen) tidak menjadi baseline Boss Pulley',()=>{
  const r=rt([CAT.boss],[FREE_PULLY]);
  const u=urg(r,CAT.boss);
  assert.equal(u.status,'unknown');
  assert.equal(u.lastKm??null,null);
});

test('S2728 kartu lama tanpa komponen tetap cocok ke log induk (bentuk dgn induk) dan ke log bernama sama (bentuk backup)',()=>{
  const withMaster=Object.assign({},CAT.legacy,{masterCategoryId:'servis-cvt'});
  const r=rt([withMaster],[FREE_PULLY]);
  assert.equal(r.c.ServiceHistoryReminderReconciliationSOT.match(FREE_PULLY,withMaster,{vehicleId:V}).ok,true);
  const byName=log({id:'legacyname',item:'Servis Cvt',km:14867,actionType:'ganti'});
  assert.equal(r.c.ServiceHistoryReminderReconciliationSOT.match(byName,CAT.legacy,{vehicleId:V}).ok,true);
});

test('S2728 log berkomponen hanya mereset komponen yang tepat',()=>{
  const l=comp('busi','servis-mesin','Busi',20237,'periksa');
  const r=rt([CAT.busi,CAT.boss],[l]);
  assert.equal(urg(r,CAT.busi).lastKm,20237);
  assert.equal(urg(r,CAT.boss).status,'unknown');
});

test('S2728 log tanpa actionType bukan bukti ganti',()=>{
  const l=comp('kampas-kopling-ganda','servis-cvt','Kampas Kopling Ganda',5500,null);
  l.actionType=null;
  const r=rt([CAT.kkg],[l]);
  assert.equal(urg(r,CAT.kkg).status,'unknown');
});

test('S2728 ganti me-nol-kan interval komponen (Kampas Kopling Ganda 5.500)',()=>{
  const r=rt([CAT.kkg],[comp('kampas-kopling-ganda','servis-cvt','Kampas Kopling Ganda',5500,'ganti')]);
  const u=urg(r,CAT.kkg);
  assert.equal(u.lastKm,5500);
  assert.notEqual(u.status,'unknown');
});

test('S2728 T1 sumbu bersih: log bersih mereset, log periksa tidak, ganti juga mereset',()=>{
  const bersih=rt([CAT.rumah],[comp('pembersihan-rumah-cvt','servis-cvt','Pembersihan Rumah CVT',14867,'bersih')]);
  assert.equal(urg(bersih,CAT.rumah).lastKm,14867,'bersih harus mereset');
  const periksa=rt([CAT.rumah],[comp('pembersihan-rumah-cvt','servis-cvt','Pembersihan Rumah CVT',14867,'periksa')]);
  assert.equal(urg(periksa,CAT.rumah).status,'unknown','periksa tidak boleh mereset sumbu bersih');
  const ganti=rt([CAT.rumah],[comp('pembersihan-rumah-cvt','servis-cvt','Pembersihan Rumah CVT',14867,'ganti')]);
  assert.equal(urg(ganti,CAT.rumah).lastKm,14867,'ganti me-nol-kan semua sumbu');
});

test('S2728 T3 AI memakai baseline yang sama dengan engine (tanpa baseline sendiri)',()=>{
  const logs=[FREE_KORTER,FREE_PULLY,comp('kampas-kopling-ganda','servis-cvt','Kampas Kopling Ganda',20000,'ganti'),comp('busi','servis-mesin','Busi',21000,'periksa'),log({id:'noact',item:'Servis Cvt',km:21000,actionType:null})];
  const r=rt([CAT.busi,CAT.boss,CAT.kkg,CAT.legacy],logs);
  const text=r.c.aiServiceIntervalStatusText(V,21311);
  for(const cat of [CAT.busi,CAT.boss,CAT.kkg,CAT.legacy]){
    const u=urg(r,cat);
    const line=text.split(', ').find(x=>x.startsWith(cat.name+':'));
    assert.ok(line,'baris AI ada untuk '+cat.name);
    assert.equal(line.includes('belum diketahui'),u.status==='unknown',cat.name+': AI vs engine harus konsisten ('+line+' / '+u.status+')');
    if(u.status!=='unknown'&&u.sisaKm!=null)assert.ok(line.includes(Math.abs(u.sisaKm).toLocaleString('id-ID')),cat.name+' sisa km sama dgn engine');
  }
});

test('S2728 T3 AI hanya menampilkan kategori kendaraan yang bersangkutan',()=>{
  const other=Object.assign({},CAT.busi,{id:'c_other',name:'Kategori Mobil Lain',vehicleId:'veh_lain'});
  const r=rt([CAT.busi,other],[]);
  const text=r.c.aiServiceIntervalStatusText(V,1000);
  assert.ok(text.includes('Busi:'));
  assert.ok(!text.includes('Kategori Mobil Lain'));
});

test('S2728 AI: kategori showInReminder=false (mis. Busa Filter CVT di backup) tidak ikut daftar AI, sama seperti kartu Pengingat',()=>{
  const hidden=Object.assign({},CAT.busi,{id:'c_hidden',name:'Busa Filter CVT',showInReminder:false,serviceComponentId:'busa-filter-cvt',masterCategoryId:'servis-cvt'});
  const r=rt([CAT.busi,hidden],[]);
  const text=r.c.aiServiceIntervalStatusText(V,1000);
  assert.ok(text.includes('Busi:'));
  assert.ok(!text.includes('Busa Filter CVT'));
});
