'use strict';
// S2433.3 (TAHAP 1, AUDIT): tes KARAKTERISASI perilaku AKTUAL jenis vs vehicleType pada build 2329.
// BUKAN pernyataan bahwa perilaku ini benar. Jika kebijakan konflik diubah nanti, tes ini sengaja gagal
// sebagai penanda perubahan perilaku. Tidak ada kode produksi yang diubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBundlesVm, evalIn } = require('./helpers/loadBundleVm.js');

async function run(vehicle) {
  const ctx = loadBundlesVm(); const E = (c) => evalIn(ctx, c);
  E(`toast=function(){}; D.servisLogs=[]; D.sparepartCats=[]; D.vehicles=[];`);
  ctx.__v = JSON.parse(JSON.stringify(vehicle));
  E(`D.vehicles=[__v]`);
  const snap = () => JSON.parse(E(`JSON.stringify((function(){const x=D.vehicles[0];return {jenis:x.jenis,vehicleType:x.vehicleType,bodyType:x.bodyType,sotType:x.sot&&x.sot.vehicleType,s2433:ServisChecklist._vehicleProfile(x.id).type,auditCodes:(VehicleCarNotesSOT.audit(x.id).issues||[]).map(i=>i.code)}})())`));
  const before = snap();
  await E(`VehicleSOTProvisioning.provisionVehicle(D.vehicles[0])`);
  return { before, after: snap(), E };
}

test('A — model dikenal (Vario 125), jenis diedit ke mobil: provisioning menimpa vehicleType dari profil model; divergensi bertahan', async () => {
  const { before, after } = await run({ id: 'A', name: 'Honda Vario 125', modelId: 'vario-125', jenis: 'mobil', vehicleType: 'motor', bodyType: 'matic' });
  assert.equal(before.jenis, 'mobil'); assert.equal(before.vehicleType, 'motor');
  assert.equal(after.jenis, 'mobil', 'jenis tidak diubah provisioning');
  assert.equal(after.vehicleType, 'motor', 'vehicleType dari profil model');
  assert.equal(after.sotType, 'motor', 'snapshot SOT mengikuti vehicleType');
  assert.equal(after.s2433, 'mobil', 'proyeksi S2433 mengikuti jenis');
  assert.deepEqual(after.auditCodes, [], 'audit SOT TIDAK mendeteksi konflik lintas-field (blind spot)');
});

test('B — tanpa model, nama "Toyota Avanza", jenis=motor: provisioning MENGUBAH jenis & vehicleType menjadi mobil (sumber: inferensi nama)', async () => {
  const { before, after } = await run({ id: 'B', name: 'Toyota Avanza', jenis: 'motor', vehicleType: 'motor' });
  assert.equal(before.jenis, 'motor'); assert.equal(before.vehicleType, 'motor');
  assert.equal(after.jenis, 'mobil', 'jenis pilihan user ditimpa inferensi nama');
  assert.equal(after.vehicleType, 'mobil');
  assert.equal(after.bodyType, 'mpv');
  assert.equal(after.sotType, 'mobil'); assert.equal(after.s2433, 'mobil');
});

test('C — jenis=listrik: tidak dipaksa menjadi motor; proyeksi S2433 = listrik (semua komponen tampil, konservatif)', async () => {
  const { after } = await run({ id: 'C', name: 'Mobil Listrik X', jenis: 'listrik', vehicleType: 'mobil' });
  assert.equal(after.jenis, 'listrik'); assert.equal(after.vehicleType, 'mobil');
  assert.equal(after.s2433, 'listrik'); assert.equal(after.sotType, 'mobil');
});

test('D — vehicleType kosong tanpa model/inferensi: field tetap kosong', async () => {
  const { before, after } = await run({ id: 'D', name: 'Kendaraan Anu', jenis: 'mobil' });
  assert.equal(before.vehicleType, undefined); assert.equal(after.vehicleType, undefined);
  assert.equal(after.jenis, 'mobil'); assert.equal(after.s2433, 'mobil'); assert.equal(after.sotType, 'mobil');
});

test('E — "Honda Beat", jenis=mobil: perilaku sama dengan A (model dikenali, vehicleType dari profil)', async () => {
  const { after } = await run({ id: 'E', name: 'Honda Beat', jenis: 'mobil', vehicleType: 'motor' });
  assert.equal(after.jenis, 'mobil'); assert.equal(after.vehicleType, 'motor');
  assert.equal(after.bodyType, 'matic'); assert.equal(after.sotType, 'motor'); assert.equal(after.s2433, 'mobil');
});

test('Audit SOT hanya membandingkan (vehicleType||jenis||type) dengan snapshot sot.vehicleType, bukan jenis vs vehicleType', () => {
  const ctx = loadBundlesVm(); const E = (c) => evalIn(ctx, c);
  E(`D.vehicles=[{id:'p',jenis:'mobil',vehicleType:'motor',sot:{vehicleId:'p',vehicleType:'motor'}},{id:'q',jenis:'mobil',vehicleType:'mobil',sot:{vehicleId:'q',vehicleType:'motor'}}]`);
  assert.deepEqual(JSON.parse(E(`JSON.stringify(VehicleCarNotesSOT.audit('p').issues.map(i=>i.code))`)), []);
  assert.deepEqual(JSON.parse(E(`JSON.stringify(VehicleCarNotesSOT.audit('q').issues.map(i=>i.code))`)), ['SOT_VEHICLE_TYPE_MISMATCH']);
});

test('Backup -> restore: jenis & vehicleType tidak berubah; kendaraan lama tanpa sot hanya mendapat snapshot sot.vehicleType', async () => {
  const ctx = loadBundlesVm(); const E = (c) => evalIn(ctx, c);
  E(`toast=function(){}; D.vehicles=[
    {id:'A',name:'Honda Vario 125',modelId:'vario-125',jenis:'mobil',vehicleType:'motor',bodyType:'matic',sot:{vehicleId:'A',vehicleType:'motor'}},
    {id:'L',name:'Listrik X',jenis:'listrik',vehicleType:'mobil',sot:{vehicleId:'L',vehicleType:'mobil'}},
    {id:'O',name:'Data Lama',vehicleType:'mobil'}];`);
  const backup = E(`JSON.stringify({vehicles:D.vehicles})`);
  E(`D.vehicles=[]`); ctx.__imp = JSON.parse(backup); await E(`applyRestoredData(__imp)`);
  const r = JSON.parse(E(`JSON.stringify(D.vehicles.map(v=>({id:v.id,jenis:v.jenis,vehicleType:v.vehicleType,sot:v.sot&&v.sot.vehicleType})))`));
  assert.deepEqual(r, [
    { id: 'A', jenis: 'mobil', vehicleType: 'motor', sot: 'motor' },
    { id: 'L', jenis: 'listrik', vehicleType: 'mobil', sot: 'mobil' },
    { id: 'O', vehicleType: 'mobil', sot: 'mobil' }]);
});

test('Konsumen jenis-saja (Shop-Katalog; Torsi mendelegasikan ke sana): kendaraan lama tanpa jenis tampil sebagai motor walau vehicleType=mobil', () => {
  const ctx = loadBundlesVm(); const E = (c) => evalIn(ctx, c);
  E(`D.vehicles=[{id:'O',name:'Data Lama',vehicleType:'mobil'},{id:'M',name:'Edit',jenis:'mobil',vehicleType:'motor'}]`);
  const shop = JSON.parse(E(`JSON.stringify(ShopKatalogDinamisAPI.daftarKendaraan())`));
  const torsi = JSON.parse(E(`JSON.stringify(TorsiVehicleAPI.daftarKendaraan())`));
  assert.ok(Array.isArray(shop.list) && shop.list.length === 2, 'daftarKendaraan benar-benar dijalankan');
  const byId = (r) => Object.fromEntries(r.list.map((x) => [x.id, x.jenis]));
  assert.deepEqual(byId(shop), { O: 'motor', M: 'mobil' }, 'jenis-saja dengan default motor');
  assert.deepEqual(byId(torsi), byId(shop), 'Torsi mendelegasikan ke Shop-Katalog');
});
