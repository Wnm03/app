'use strict';
// S2433.1: kompatibilitas komponen servis per tipe kendaraan (motor/mobil).
// Aditif: master 102 item TIDAK berkurang; filter hanya pada proyeksi kendaraan aktif.
// Dijalankan terhadap bundle terkirim (perilaku nyata).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBundlesVm, evalIn } = require('./helpers/loadBundleVm.js');

const DOM = `(function(){const mk=()=>new Proxy({style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],innerHTML:'',textContent:'',value:''},{get:(t,k)=>k in t?t[k]:(typeof k==='string'&&k!=='then'?function(){return undefined}:undefined),set:(t,k,v)=>{t[k]=v;return true}});const c={};document.getElementById=id=>c[id]||(c[id]=mk());})();window.__cnTabBootInitialized=true;curCnTab='bbm';`;

function boot() {
  const ctx = loadBundlesVm();
  const E = (c) => evalIn(ctx, c);
  E(`toast=function(){}; D.servisLogs=[]; D.vehicles=[
    {id:'m1',name:'Vario 125',vehicleType:'motor',bodyType:'matic',modelId:'vario-125',odometer:12000},
    {id:'c1',name:'Mobil Uji',vehicleType:'mobil',bodyType:'mpv',odometer:50000},
    {id:'b1',name:'Supra',vehicleType:'motor',bodyType:'bebek',odometer:9000},
    {id:'m2',name:'Motor Tanpa Body',vehicleType:'motor',odometer:1000},
    {id:'e1',name:'Listrik',jenis:'listrik',odometer:100},
    {id:'x1',name:'Tanpa Tipe',odometer:1}
  ]; curVehicleId='m1'; ServisChecklist.open('m1');`);
  E(DOM);
  return E;
}
const vis = (E, id, veh) => E(`(function(){const f=ServisChecklist.findItemById('${id}');return ServisChecklist.isItemVisible(f.item,'${veh}')})()`);
const catsOf = (E, veh) => JSON.parse(E(`JSON.stringify(D.sparepartCats.filter(c=>c.vehicleId==='${veh}').map(c=>c.serviceComponentId).filter(Boolean))`));

test('S2433.1: master tetap 102 item/id unik; metadata scope lengkap & klasifikasi sesuai rancangan', () => {
  const E = boot();
  const r = JSON.parse(E(`(function(){const it=SERVICE_CHECKLIST_GROUPS.flatMap(g=>ServisChecklist.itemsOfGroup(g));
    const ids=new Set(it.map(i=>i.id));
    return JSON.stringify({total:it.length,uniq:ids.size,
      noStatus:it.filter(i=>!i.scopeStatus).length,
      universal:it.filter(i=>i.universal===true&&i.scopeStatus==='confirmed').length,
      motor:it.filter(i=>i.vehicleTypeScope&&i.vehicleTypeScope.join()==='motor'&&!i.bodyTypeScope).length,
      matic:it.filter(i=>i.bodyTypeScope&&i.bodyTypeScope.join()==='matic').length,
      unverified:it.filter(i=>i.scopeStatus==='unverified').length,
      unverifiedClaimedUniversal:it.filter(i=>i.scopeStatus==='unverified'&&i.universal).length})})()`));
  assert.equal(r.total, 102); assert.equal(r.uniq, 102); assert.equal(r.noStatus, 0);
  // S2731.3: +1 universal (gasket-tutup-head), -1 unverified (kabel-rem-belakang-body jadi alias, bukan komponen aktif).
  assert.equal(r.universal, 60); assert.equal(r.motor, 12); assert.equal(r.matic, 18); assert.equal(r.unverified, 12);
  assert.equal(r.unverifiedClaimedUniversal, 0, 'item belum pasti tidak boleh diklaim universal');
});

test('S2433.1: motor matic melihat CVT & rantai keteng; mobil tidak (tetapi universal tetap)', () => {
  const E = boot();
  for (const id of ['v-belt-cvt', 'roller-cvt', 'rantai-keteng-tensioner', 'oli-shockbreaker', 'standar-tengah-samping']) {
    assert.equal(vis(E, id, 'm1'), true, id + ' motor');
    assert.equal(vis(E, id, 'c1'), false, id + ' mobil harus tersembunyi');
  }
  for (const id of ['filter-oli', 'busi', 'oli-mesin', 'aki', 'filter-udara', 'kampas-rem-depan', 'ban-depan']) {
    assert.equal(vis(E, id, 'm1'), true, id + ' motor'); assert.equal(vis(E, id, 'c1'), true, id + ' mobil');
  }
});

test('S2433.1: motor bebek tanpa CVT tetapi punya rantai keteng; body tak dikenal => konservatif tampil', () => {
  const E = boot();
  assert.equal(vis(E, 'v-belt-cvt', 'b1'), false);
  assert.equal(vis(E, 'rantai-keteng-tensioner', 'b1'), true);
  assert.equal(vis(E, 'v-belt-cvt', 'm2'), true, 'body tak diketahui tidak boleh menyembunyikan');
});

test('S2433.1: item belum terverifikasi tetap tampil untuk mobil; tipe tak dikenal/listrik/null => semua tampil', () => {
  const E = boot();
  for (const id of ['tromol-rem-belakang', 'shock-belakang', 'gear-final-drive', 'kabel-gas']) assert.equal(vis(E, id, 'c1'), true, id);
  for (const veh of ['e1', 'x1', 'tidak-ada']) {
    assert.equal(E(`SERVICE_CHECKLIST_GROUPS.flatMap(g=>ServisChecklist.itemsOfGroup(g)).filter(i=>!ServisChecklist.isItemVisible(i,'${veh}')).length`), 0, veh);
  }
});

test('S2433.1: riwayat/state lama tetap terbaca di kendaraan mobil (komponen motor-only yang sudah dicentang tetap tampil)', () => {
  const E = boot();
  const f = JSON.parse(E(`JSON.stringify((function(){const x=ServisChecklist.findItemById('v-belt-cvt');return {gi:x.groupIdx,ii:x.itemIdx}})())`));
  E(`ServisChecklist.open('c1')`);
  assert.equal(vis(E, 'v-belt-cvt', 'c1'), false);
  E(`ServisChecklist._checked['v-belt-cvt']='periksa'`);
  assert.equal(vis(E, 'v-belt-cvt', 'c1'), true, 'state yang ada tidak boleh hilang dari layar');
  // ringkasan riwayat lama tetap menghitung item (findItemById bebas dari filter)
  const sum = JSON.parse(E(`JSON.stringify(ServisChecklist.summaryFromLog({checklist:[{itemId:'v-belt-cvt',actionType:'ganti'}]}))`));
  assert.equal(sum.replaced, 1);
  assert.ok(f.gi >= 0 && f.ii >= 0);
});

test('S2433.1: proyeksi kategori — mobil tanpa kategori CVT/motor-only, motor lengkap; idempoten & tanpa duplikat', () => {
  const E = boot();
  E(`curVehicleId='m1';Sparepart._catRepairKey=null;Sparepart.repairCategoryProjection()`);
  E(`selectVehicle('c1')`);
  const motor = catsOf(E, 'm1'), mobil = catsOf(E, 'c1');
  assert.ok(motor.includes('v-belt-cvt') && motor.includes('rantai-keteng-tensioner') && motor.includes('oli-shockbreaker'));
  assert.ok(!mobil.includes('v-belt-cvt') && !mobil.includes('roller-cvt') && !mobil.includes('rantai-keteng-tensioner') && !mobil.includes('oli-shockbreaker'));
  assert.ok(mobil.includes('oli-mesin') && mobil.includes('filter-oli') && mobil.includes('aki'));
  assert.ok(mobil.length > 0 && mobil.length < motor.length);
  const dup = (v) => E(`(function(){const m={};let d=0;D.sparepartCats.forEach(c=>{if(c.vehicleId!=='${v}'||!c.serviceComponentId)return;if(m[c.serviceComponentId])d++;m[c.serviceComponentId]=1});return d})()`);
  assert.equal(dup('m1'), 0); assert.equal(dup('c1'), 0);
  const before = E(`D.sparepartCats.length`);
  E(`Sparepart._catRepairKey=null;Sparepart.repairCategoryProjection();Sparepart._catRepairKey=null;Sparepart.repairCategoryProjection()`);
  assert.equal(E(`D.sparepartCats.length`), before, 'dijalankan ulang tidak menambah/menggandakan kategori');
});

test('S2433.1: ganti tipe kendaraan (motor->mobil) memicu proyeksi ulang & tidak menghapus kategori/riwayat lama', () => {
  const E = boot();
  E(`curVehicleId='m2';Sparepart._catRepairKey=null;Sparepart.repairCategoryProjection()`);
  const before = catsOf(E, 'm2');
  assert.ok(before.includes('v-belt-cvt'), 'sebagai motor tanpa body: konservatif, CVT ada');
  E(`D.servisLogs.push({id:'log1',vehicleId:'m2',checklist:[{itemId:'v-belt-cvt',actionType:'ganti'}]})`);
  E(`(function(){const v=D.vehicles.find(x=>x.id==='m2');v.vehicleType='mobil';v.bodyType='sedan';})()`);
  E(`Sparepart.repairCategoryProjection()`); // kunci memo ikut tipe => harus jalan ulang tanpa reset manual
  const after = catsOf(E, 'm2');
  for (const id of before) assert.ok(after.includes(id), 'kategori lama dipertahankan: ' + id);
  assert.equal(E(`D.servisLogs.filter(l=>l.vehicleId==='m2').length`), 1);
  assert.equal(vis(E, 'v-belt-cvt', 'm2'), false, 'untuk mobil komponen CVT tidak tampil lagi di checklist baru');
});

test('S2433.1: kondisi Rusak & mode Manual pada kendaraan mobil tetap bekerja (tidak regresi S2433)', () => {
  const E = boot();
  E(`ServisChecklist.open('c1')`);
  const it = JSON.parse(E(`JSON.stringify((function(){const x=ServisChecklist.findItemById('filter-oli');return {gi:x.groupIdx,ii:x.itemIdx}})())`));
  E(`ServisChecklist.toggleItem(${it.gi},${it.ii})`);
  const r = JSON.parse(E(`JSON.stringify(ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak'))`));
  assert.equal(r.actionType, 'ganti'); assert.equal(r.autoApplied, true);
  E(`ServisChecklist.setActionType(${it.gi},${it.ii},'periksa')`);
  assert.equal(E(`ServisChecklist.actionMode('filter-oli')`), 'manual');
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak')`);
  assert.equal(E(`ServisChecklist._checked['filter-oli']`), 'periksa', 'manual bertahan');
});
