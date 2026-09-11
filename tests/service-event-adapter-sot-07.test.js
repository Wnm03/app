const test = require('node:test');
const assert = require('node:assert/strict');
const { toCanonicalServiceEvent } = require('../modules/vehicle/service-event-adapter');

test('legacy catId is normalized to categoryId without mutating input', () => {
  const legacy = { item: 'Oli Mesin', catId: 'sp_oli', km: 12000 };
  const event = toCanonicalServiceEvent(legacy, { masterCategoryId: 'servis-mesin' });
  assert.equal(event.categoryId, 'sp_oli');
  assert.equal(event.masterCategoryId, 'servis-mesin');
  assert.equal(legacy.catId, 'sp_oli');
  assert.equal(legacy.categoryId, undefined);
});

test('canonical fields take precedence over legacy aliases', () => {
  const event = toCanonicalServiceEvent(
    { categoryId: 'canonical', catId: 'legacy', masterCategoryId: 'servis-cvt' },
    { id: 'fallback', masterCategoryId: 'servis-mesin' }
  );
  assert.equal(event.categoryId, 'canonical');
  assert.equal(event.masterCategoryId, 'servis-cvt');
});

test('category may be absent without inventing an ID', () => {
  const event = toCanonicalServiceEvent({ item: 'Coolant' });
  assert.equal(event.categoryId, null);
  assert.equal(event.masterCategoryId, null);
});
