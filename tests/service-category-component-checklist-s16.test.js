const test = require('node:test');
const assert = require('node:assert/strict');
const { SERVICE_CHECKLIST_GROUPS, ServisChecklist } = require('../modules/vehicle/servis-checklist.js');
const F = require('./helpers/serviceMasterFixture');

test('S16: kategori servis menjadi filter checklist komponen, bukan auto-servis seluruh kategori', () => {
  assert.equal(SERVICE_CHECKLIST_GROUPS.length, 13);
  for (const g of SERVICE_CHECKLIST_GROUPS) {
    const found = ServisChecklist.findGroupByMasterCategoryId(g.masterCategoryId);
    assert.ok(found);
    assert.equal(found.groupIdx, SERVICE_CHECKLIST_GROUPS.indexOf(g));
    assert.ok(found.group.items.length > 0);
  }
});

test('S16: setelah kategori dipilih, hanya komponen dalam kategori tersebut yang tersedia', () => {
  const mesin = ServisChecklist.itemsForMasterCategory('servis-mesin');
  // 8 komponen legacy tetap di depan & berurutan; komponen katalog (S1864+) menyusul setelahnya.
  const legacyMesin = ['oli-mesin','filter-oli','busi','celah-klep','rantai-keteng-tensioner','kompresi-mesin','filter-kawat-oli-mesin','paking-knalpot'];
  assert.deepEqual(mesin.slice(0, legacyMesin.length).map(x => x.id), legacyMesin);
  assert.ok(mesin.length > legacyMesin.length, 'komponen katalog servis-mesin harus ikut tersedia');
  assert.ok(mesin.slice(legacyMesin.length).every(x => !F.LEGACY_CHECKLIST_IDS.includes(x.id)), 'setelah 8 legacy hanya komponen katalog');
  assert.ok(mesin.every(x => x.masterCategoryId === 'servis-mesin'));
  assert.equal(ServisChecklist.itemsForMasterCategory('servis-cvt').some(x => x.id === 'oli-mesin'), false);
  assert.deepEqual(ServisChecklist.itemsForMasterCategory('kategori-tidak-ada'), []);
});

test('S16: checklist tetap menyimpan hanya item yang dicentang', () => {
  ServisChecklist.open('vehicle-s16');
  const found = ServisChecklist.findGroupByMasterCategoryId('servis-cvt');
  const result = ServisChecklist.toggleItem(found.groupIdx, 0);
  assert.equal(result.checked, true);
  const payload = ServisChecklist.toLogPayload();
  assert.equal(payload.length, 1);
  assert.equal(payload[0].masterCategoryId, 'servis-cvt');
  assert.equal(payload[0].itemId, 'v-belt-cvt');
  ServisChecklist.open('vehicle-s16');
});
