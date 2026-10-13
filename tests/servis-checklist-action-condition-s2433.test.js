'use strict';
// S2433: periksa/ganti selalu tersedia; kondisi rusak -> ganti otomatis (bisa manual).
// Dijalankan terhadap bundle terkirim (perilaku nyata, bukan pencocokan teks).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBundlesVm, evalIn } = require('./helpers/loadBundleVm.js');

function boot() {
  const ctx = loadBundlesVm();
  const E = (c) => evalIn(ctx, c);
  E(`toast=function(){}; D.vehicles=[{id:'veh_1',name:'Vario 125',vehicleType:'motor',modelId:'vario-125',odometer:12000}]; D.servisLogs=[]; curVehicleId='veh_1'; ServisChecklist.open('veh_1');`);
  return E;
}
const find = (E, mode, valid) => JSON.parse(E(`(function(){let r=null;SERVICE_CHECKLIST_GROUPS.forEach((g,gi)=>ServisChecklist.itemsOfGroup(g).forEach((it,ii)=>{if(!r&&it.actionMode==='${mode}'&&ServisChecklist._nativeActionTypesFor(it).join('/')==='${valid}')r={gi,ii,id:it.id}}));return JSON.stringify(r)})()`));

test('S2433: setiap item checklist menawarkan periksa DAN ganti', () => {
  const E = boot();
  const bad = JSON.parse(E(`JSON.stringify(SERVICE_CHECKLIST_GROUPS.flatMap(g=>ServisChecklist.itemsOfGroup(g)).filter(i=>{const v=ServisChecklist._validActionTypesFor(i);return !(v.includes('periksa')&&v.includes('ganti'))}).map(i=>i.id))`));
  assert.deepEqual(bad, []);
});

test('S2433: rusak -> ganti otomatis, baik -> periksa, kembali ke default saat dikosongkan', () => {
  const E = boot();
  const it = find(E, 'periksa', 'periksa'); // item hanya-periksa (mis. Filter Oli)
  E(`ServisChecklist.toggleItem(${it.gi},${it.ii})`);
  assert.equal(E(`ServisChecklist._checked['${it.id}']`), 'periksa');
  const r = JSON.parse(E(`JSON.stringify(ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak'))`));
  assert.equal(r.ok, true); assert.equal(r.actionType, 'ganti'); assert.equal(r.autoApplied, true);
  assert.equal(E(`ServisChecklist.actionMode('${it.id}')`), 'auto');
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'baik')`);
  assert.equal(E(`ServisChecklist._checked['${it.id}']`), 'periksa');
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak')`);
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'')`);
  assert.equal(E(`ServisChecklist._checked['${it.id}']`), 'periksa');
});

test('S2433: pilihan manual tidak ditimpa kondisi; tombol Otomatis mengembalikan', () => {
  const E = boot();
  const it = find(E, 'periksa', 'periksa');
  E(`ServisChecklist.toggleItem(${it.gi},${it.ii})`);
  E(`ServisChecklist.setActionType(${it.gi},${it.ii},'periksa')`);
  assert.equal(E(`ServisChecklist.actionMode('${it.id}')`), 'manual');
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak')`);
  assert.equal(E(`ServisChecklist._checked['${it.id}']`), 'periksa', 'manual harus bertahan');
  const a = JSON.parse(E(`JSON.stringify(ServisChecklist.setActionAuto(${it.gi},${it.ii}))`));
  assert.equal(a.actionType, 'ganti'); assert.equal(a.mode, 'auto');
});

test('S2433: item ganti-saja & bersih-saja kini bisa Periksa; periksa-saja bisa Ganti', () => {
  const E = boot();
  for (const [mode, valid, other] of [['ganti', 'ganti', 'periksa'], ['bersih', 'bersih', 'ganti'], ['periksa', 'periksa', 'ganti']]) {
    const it = find(E, mode, valid);
    E(`ServisChecklist.toggleItem(${it.gi},${it.ii})`);
    const r = JSON.parse(E(`JSON.stringify(ServisChecklist.setActionType(${it.gi},${it.ii},'${other}'))`));
    assert.equal(r.ok, true, `${mode} -> ${other}`);
  }
});

test('S2433: riwayat tersimpan dimuat sebagai manual (tidak ditimpa otomatis saat edit)', () => {
  const E = boot();
  const it = find(E, 'periksa', 'periksa');
  E(`ServisChecklist.loadFromLog({checklist:[{itemId:'${it.id}',actionType:'periksa',conditionResult:'baik'}]})`);
  assert.equal(E(`ServisChecklist.actionMode('${it.id}')`), 'manual');
  E(`ServisChecklist.setConditionResult(${it.gi},${it.ii},'rusak')`);
  assert.equal(E(`ServisChecklist._checked['${it.id}']`), 'periksa');
});

test('S2433: resolveServisCatForVehicle tahan beda tipe id (angka vs string)', () => {
  const E = boot();
  E(`D.sparepartCats.push({id:'x777',name:'Busi',vehicleId:'777',serviceComponentId:'busi'})`);
  assert.equal(E(`resolveServisCatForVehicle('Busi',777).id`), 'x777');
});

test('S2433: UI menampilkan tombol tindakan walau item belum dicentang + mode otomatis/manual', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/vehicle/servis.js'), 'utf8');
  assert.doesNotMatch(src, /const actions=checked&&valid\.length>1\?/);
  assert.match(src, /setServiceChecklistActionAuto/);
  assert.match(src, /Otomatis \(rusak → ganti\)/);
});

test('S2433: pindah kendaraan menyiapkan kategori kendaraan itu tanpa tab Servis aktif, terisolasi per kendaraan', () => {
  const E = boot();
  E(`(function(){const mk=()=>new Proxy({style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],innerHTML:'',textContent:'',value:''},{get:(t,k)=>k in t?t[k]:(typeof k==='string'&&k!=='then'?function(){return undefined}:undefined),set:(t,k,v)=>{t[k]=v;return true}});const c={};document.getElementById=id=>c[id]||(c[id]=mk());})();
    window.__cnTabBootInitialized=true; curCnTab='bbm';
    D.vehicles.push({id:'veh_2',name:'Beat',vehicleType:'motor',odometer:30000});`);
  E(`selectVehicle('veh_2')`);
  assert.ok(Number(E(`D.sparepartCats.filter(c=>c.vehicleId==='veh_2').length`)) > 0);
  assert.equal(E(`D.sparepartCats.filter(c=>c.vehicleId==='veh_2'&&c.vehicleId!==curVehicleId).length`), 0);
  assert.equal(E(`(function(){const m={};let d=0;D.sparepartCats.forEach(c=>{if(!c.vehicleId||!c.serviceComponentId)return;const k=c.vehicleId+'|'+c.serviceComponentId;if(m[k])d++;m[k]=1});return d})()`), 0);
});
