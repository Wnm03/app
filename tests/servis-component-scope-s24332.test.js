'use strict';
// S2433.2: (1) jenis (hasil edit user) menang atas vehicleType turunan, (2) id kendaraan campuran
// angka/string tidak memecah pencocokan, (3) chip kategori & dropdown komponen mengikuti kendaraan aktif.
// Dijalankan terhadap bundle terkirim (perilaku nyata), pola sama dgn S2433.1.
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
    {id:'k1',name:'Edit Motor->Mobil',jenis:'mobil',vehicleType:'motor',bodyType:'matic',odometer:1},
    {id:'k2',name:'Edit Mobil->Motor',jenis:'motor',vehicleType:'mobil',bodyType:'matic',odometer:1}
  ]; curVehicleId='m1'; ServisChecklist.open('m1');`);
  E(DOM);
  return E;
}
const vis = (E, id, veh) => E(`(function(){const f=ServisChecklist.findItemById('${id}');return ServisChecklist.isItemVisible(f.item,'${veh}')})()`);

test('S2433.2: jenis hasil edit menang atas vehicleType basi (kedua arah)', () => {
  const E = boot();
  assert.equal(vis(E, 'v-belt-cvt', 'k1'), false, 'jenis=mobil, vehicleType=motor: CVT harus tersembunyi');
  assert.equal(vis(E, 'v-belt-cvt', 'k2'), true, 'jenis=motor, vehicleType=mobil: CVT harus tampil');
  assert.equal(E(`ServisChecklist._vehicleProfile('k1').type`), 'mobil');
  assert.equal(E(`ServisChecklist._vehicleProfile('k2').type`), 'motor');
  assert.equal(E(`ServisChecklist.scopeKeyForVehicle('k1')`).split('/')[0], 'mobil');
});

test('S2433.2: id campuran angka/string tetap cocok (kategori, part, event servis, BBM)', () => {
  const E = boot();
  const r = JSON.parse(E(`JSON.stringify({
    catNumVsStr: catVisibleForVehicle({vehicleId:12345},'12345'),
    catStrVsNum: catVisibleForVehicle({vehicleId:'12345'},12345),
    catOther: catVisibleForVehicle({vehicleId:12345},'999'),
    catGlobal: catVisibleForVehicle({},'999'),
    partMixed: Sparepart.isPartForVehicle({vehicleId:777},'777'),
    partOther: Sparepart.isPartForVehicle({vehicleId:777},'778'),
    evTx: !!findServiceEventForTransaction([{txLinkId:'t1',vehicleId:42}],'t1','42'),
    evTxOther: !!findServiceEventForTransaction([{txLinkId:'t1',vehicleId:42}],'t1','43'),
    evKey: !!findServiceEventByIdempotencyKey([{idempotencyKey:'k',vehicleId:'42'}],'k',42),
    evIsFor: isServiceEventForVehicle({vehicleId:42},'42'),
    evIsForOther: isServiceEventForVehicle({vehicleId:42},'41'),
    evIsForNone: isServiceEventForVehicle({vehicleId:42},null)
  })`));
  assert.deepEqual(r, { catNumVsStr: true, catStrVsNum: true, catOther: false, catGlobal: true, partMixed: true, partOther: false,
    evTx: true, evTxOther: false, evKey: true, evIsFor: true, evIsForOther: false, evIsForNone: false });
  D_bbm: {
    E(`D.bbmLogs=[{id:1,vehicleId:7},{id:2,vehicleId:'7'},{id:3,vehicleId:'8'}]`);
    assert.equal(E(`FuelStorage.logs('7').length`), 2);
    assert.equal(E(`FuelStorage.logs(7).length`), 2);
    assert.equal(E(`FuelStorage.logs().length`), 3);
  }
});

test('S2433.2: log servis id campuran terbaca oleh helper stok/riwayat per kendaraan', () => {
  const E = boot();
  const n = E(`(function(){D.servisLogs=[{id:'s1',vehicleId:55,km:1000,items:[]},{id:'s2',vehicleId:'55',km:2000,items:[]},{id:'s3',vehicleId:'56',km:3000,items:[]}];
    return D.servisLogs.filter(s=>_spVidEq(s.vehicleId,'55')).length})()`);
  assert.equal(n, 2);
  assert.equal(E(`_spVidEq(null,undefined)`), false, 'perilaku === nullish dipertahankan');
  assert.equal(E(`_spVidEq(undefined,undefined)`), true);
});

test('S2433.2: chip Kategori Servis tidak menampilkan "Servis CVT" untuk mobil, tetap untuk motor matic', () => {
  const E = boot();
  const chips = (veh) => { E(`ServisChecklist._vehicleId='${veh}'; Servis._serviceChecklistMasterCategoryIds=[]; Servis.renderServiceMasterCategoryChips(); `); return E(`document.getElementById('servisMasterCategoryChips').innerHTML`); };
  const motor = chips('m1'), mobil = chips('c1');
  assert.match(motor, /CVT/i, 'motor matic harus punya chip CVT');
  assert.doesNotMatch(mobil, /CVT/i, 'mobil tidak boleh punya chip CVT');
  assert.ok(mobil.includes('data-action="Servis.toggleServiceChecklistMasterCategory"'), 'kategori lain tetap ada');
  // kategori yang sudah dipilih tetap tampil walau tak kompatibel (state lama tidak hilang)
  const cvtId = E(`(function(){const g=SERVICE_CHECKLIST_GROUPS.find(g=>/cvt/i.test(g.group));return g&&g.masterCategoryId})()`);
  assert.ok(cvtId, 'grup CVT ada di master');
  E(`ServisChecklist._vehicleId='c1'; Servis._serviceChecklistMasterCategoryIds=['${cvtId}']; Servis.renderServiceMasterCategoryChips();`);
  assert.match(E(`document.getElementById('servisMasterCategoryChips').innerHTML`), /CVT/i);
});

test('S2433.2: dropdown Komponen menyaring komponen tak kompatibel (mobil) dan memuatnya untuk motor matic', () => {
  const E = boot();
  const cvtId = E(`(function(){const g=SERVICE_CHECKLIST_GROUPS.find(g=>/cvt/i.test(g.group));return g&&g.masterCategoryId})()`);
  const opts = (veh, mid) => { E(`ServisChecklist._vehicleId='${veh}'; Servis.activeMasterCategoryFilter=${mid ? `'${mid}'` : 'null'}; Servis.activeServiceComponentFilter=null; Servis.renderServiceComponentFilter(document.getElementById('servisChecklistBox')||{insertAdjacentElement(){}});`); return E(`document.getElementById('servisComponentFilterWrap').innerHTML`); };
  assert.match(opts('m1', cvtId), /V-?Belt|CVT|Roller/i, 'motor matic: komponen CVT ada');
  assert.doesNotMatch(opts('c1', cvtId), /<option value="v-belt-cvt"/, 'mobil: v-belt-cvt tidak ada');
  const allMobil = (opts('c1', null).match(/<option value="/g) || []).length;
  const allMotor = (opts('m1', null).match(/<option value="/g) || []).length;
  assert.ok(allMobil < allMotor, 'mode semua: mobil punya lebih sedikit opsi daripada motor matic');
});

test('S2433.2: proyeksi/chip/dropdown/helper id TIDAK mengubah data tersimpan (SOT: kendaraan, riwayat, kategori, master)', () => {
  const E = boot();
  E(`D.servisLogs=[{id:'s1',vehicleId:12345,km:1000,items:[]}]; D.bbmLogs=[{id:1,vehicleId:12345}]; D.vehicles.push({id:12345,name:'Angka',jenis:'mobil',vehicleType:'motor',sot:{vehicleId:'12345',vehicleType:'motor'}});`);
  const snap = () => E(`JSON.stringify({v:D.vehicles,s:D.servisLogs,b:D.bbmLogs,c:D.sparepartCats,m:SERVICE_CHECKLIST_GROUPS})`);
  const before = snap();
  E(`['m1','c1','k1','k2',12345].forEach(id=>{ServisChecklist._vehicleId=id;ServisChecklist._vehicleProfile(id);ServisChecklist.scopeKeyForVehicle(id);
    Servis._serviceChecklistMasterCategoryIds=[];Servis.renderServiceMasterCategoryChips();Servis.activeMasterCategoryFilter=null;Servis.renderServiceComponentFilter(document.getElementById('x')||{insertAdjacentElement(){}});
    catVisibleForVehicle({vehicleId:12345},String(id));Sparepart.isPartForVehicle({vehicleId:12345},String(id));isServiceEventForVehicle(D.servisLogs[0],String(id));FuelStorage.logs(String(id));});`);
  assert.equal(snap(), before, 'fungsi patch bersifat baca-saja: tidak boleh menulis ke D.* maupun master');
  assert.equal(E(`D.vehicles.find(v=>v.id==='k1').vehicleType`), 'motor', 'vehicleType persisten tidak disentuh');
  assert.ok(!JSON.parse(E(`JSON.stringify(VehicleCarNotesSOT.audit('k1').issues.map(i=>i.code))`)).includes('SOT_VEHICLE_TYPE_MISMATCH'), 'patch tidak memunculkan SOT_VEHICLE_TYPE_MISMATCH');
});
