'use strict';
// S2035: collectKnownGroups() sekarang hanya memproyeksikan canonical Service
// Taxonomy SOT. TORSI_DB/GENERIC_GROUP_BY_NAME tetap compatibility data untuk
// resolver/legacy history, bukan sumber taxonomy dropdown.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const CANONICAL = [
  ['servis-mesin', 'Servis Mesin', '🔧'],
  ['servis-cvt', 'Servis CVT', '🔗'],
  ['sistem-injeksi-pgmfi', 'Sistem Injeksi PGM-FI', '💉'],
  ['sistem-bahan-bakar', 'Sistem Bahan Bakar', '⛽'],
  ['sistem-pendingin', 'Sistem Pendingin', '🌡️'],
  ['sistem-pengereman', 'Sistem Pengereman', '🛑'],
  ['suspensi', 'Suspensi', '🌀'],
  ['sistem-kemudi', 'Sistem Kemudi', '🎯'],
  ['kelistrikan', 'Kelistrikan', '🔌'],
  ['roda', 'Roda', '⚙️'],
  ['filter-udara', 'Filter Udara', '💨'],
  ['final-gear', 'Final Gear', '⚙️'],
  ['body-kontrol', 'Body & Kontrol', '🎛️'],
];

function makeD(overrides = {}) { return Object.assign({ vehicles: [], sparepartCats: [] }, overrides); }
function sot(){ return { categories:()=>CANONICAL.map(([id,name,icon])=>({id,name,icon})) }; }

test('S2035 collectKnownGroups() — tepat 13 kategori canonical dari ServiceTaxonomySOT', () => {
  const ctx = loadSource(['modules/vehicle/sparepart-servis.js'], { D: makeD(), ServiceTaxonomySOT: sot() }, ['collectKnownGroups']);
  const groups = ctx.collectKnownGroups();
  assert.equal(groups.length, 13);
  assert.deepEqual(groups.map(g=>g.group), CANONICAL.map(x=>x[1]));
  groups.forEach(g => assert.ok(g.icon, `grup "${g.group}" harus punya icon`));
});

test('S2035 collectKnownGroups() — legacy TORSI/GENERIC tidak lagi bocor ke taxonomy dropdown', () => {
  const ctx = loadSource(['modules/vehicle/sparepart-servis.js'], {
    D: makeD(),
    ServiceTaxonomySOT: sot(),
    TORSI_DB: [{ cats: [{ cat: 'Grup Legacy TORSI', icon: '🧪', items: [] }] }],
  }, ['collectKnownGroups']);
  const names = ctx.collectKnownGroups().map(g=>g.group);
  assert.equal(names.includes('Grup Legacy TORSI'), false);
  assert.equal(names.includes('Perawatan Berkala'), false);
  assert.equal(names.includes('Sistem Rem'), false);
  assert.equal(names.includes('Servis Mesin'), true);
});

test('S2035 collectKnownGroups() — isolated fallback tetap aman bila SOT belum tersedia', () => {
  const ctx = loadSource(['modules/vehicle/sparepart-servis.js'], { D: makeD() }, ['collectKnownGroups']);
  assert.deepEqual(ctx.collectKnownGroups(), []);
});

test('S2035 DatabaseAPI/TORSI tidak mempengaruhi hasil taxonomy canonical', () => {
  const ctx = loadSource([
    'modules/engine/database-api.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/sparepart-servis-b.js',
  ], { D: makeD(), MY_WRENCH: { minLbft: 10, maxLbft: 80 }, ServiceTaxonomySOT: sot() }, ['collectKnownGroups', 'DatabaseAPI']);
  const before = ctx.collectKnownGroups().map(g=>g.group);
  ctx.DatabaseAPI.vehicle.getAll = () => [{ torsi: { cats: [{ cat: 'Grup Custom DatabaseAPI', icon: '🧪' }] } }];
  assert.deepEqual(ctx.collectKnownGroups().map(g=>g.group), before);
});
