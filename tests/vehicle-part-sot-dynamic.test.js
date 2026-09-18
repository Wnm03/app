const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

function loadSot() {
  const code = fs.readFileSync(require('path').join(__dirname, '..', 'modules/vehicle/vehicle-part-sot.js'), 'utf8');
  const ctx = {
    console,
    window: {},
    setTimeout,
    clearTimeout,
    sameId: (a, b) => String(a) === String(b),
    slugify: s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window.VehiclePartSOT;
}

test('SOT Vario: seed unik berdasarkan normalized part code', () => {
  const sot = loadSot();
  const rows = sot.seed;
  const keys = rows.map(x => String(x.oemCode).replace(/[\\s-]/g, '').toUpperCase());
  assert.equal(rows.length, 337);
  assert.equal(new Set(keys).size, rows.length);
  assert.ok(rows.some(x => x.oemCode === '22100-KWN-900'));
  assert.ok(rows.some(x => x.oemCode === '23100-KZR-BA0'));
});

test('SOT Vario: seluruh seed dibatasi ke vehicle veh_1 / model Vario 125', () => {
  const sot = loadSot();
  assert.ok(sot.seed.every(x => Array.isArray(x.compatibleVehicleIds) && x.compatibleVehicleIds.includes('veh_1')));
});


test('SOT-2B: kategori sparepart legacy dapat dipetakan ke catalogPartId via OEM code normalized', () => {
  const sot = loadSot();
  const items = [
    {id:'p1',partName:'Oli Mesin',oemCode:'08232-2MA-K1L',compatibleVehicleIds:['veh_1']},
    {id:'p2',partName:'Oli Mesin',oemCode:'OTHER-001',compatibleVehicleIds:['veh_1']},
  ];
  const hit = sot.getCatalogPartForSparepartCategory({name:'Oli Mesin',code:'08232 2MA K1L',vehicleId:'veh_1'}, items, 'veh_1');
  assert.equal(hit.id, 'p1');
});

test('SOT-2B: nama legacy yang ambigu tidak dipaksa menjadi link', () => {
  const sot = loadSot();
  const items = [
    {id:'p1',partName:'Kampas Rem',oemCode:'A-1',compatibleVehicleIds:['veh_1']},
    {id:'p2',partName:'Kampas Rem',oemCode:'B-2',compatibleVehicleIds:['veh_1']},
  ];
  const hit = sot.getCatalogPartForSparepartCategory({name:'Kampas Rem',code:'',vehicleId:'veh_1'}, items, 'veh_1');
  assert.equal(hit, null);
});

test('SOT-2B: part catalog untuk kendaraan lain tidak boleh tertaut', () => {
  const sot = loadSot();
  const items = [{id:'p1',partName:'Oli Mesin',oemCode:'08232-2MA-K1L',compatibleVehicleIds:['veh_other']}];
  const hit = sot.getCatalogPartForSparepartCategory({name:'Oli Mesin',code:'08232-2MA-K1L',vehicleId:'veh_1'}, items, 'veh_1');
  assert.equal(hit, null);
});
