const test = require('node:test');
const assert = require('node:assert/strict');
const { SERVICE_CHECKLIST_GROUPS, ServisChecklist } = require('../modules/vehicle/servis-checklist.js');

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
  assert.deepEqual(mesin.map(x => x.id), ['oli-mesin','busi','celah-klep','rantai-keteng-tensioner','kompresi-mesin']);
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
