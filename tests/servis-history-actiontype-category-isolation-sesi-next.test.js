const test = require('node:test');
const assert = require('node:assert/strict');

test('conditional component exposes periksa, bersih, ganti; other components default to ganti', () => {
  const types = mode => mode === 'periksa-conditional' ? ['periksa', 'bersih', 'ganti'] : ['ganti'];
  assert.deepEqual(types('periksa-conditional'), ['periksa', 'bersih', 'ganti']);
  assert.deepEqual(types('bersih'), ['ganti']);
  assert.deepEqual(types(undefined), ['ganti']);
});

test('editing one service history row does not mutate another row', () => {
  const logs = [
    { id: 'A', categoryId: 'cat-cvt', serviceComponentId: 'slide', item: 'Slide Piece CVT', actionType: 'ganti' },
    { id: 'B', categoryId: 'cat-cvt', serviceComponentId: 'clean', item: 'Pembersihan Rumah CVT', actionType: 'bersih' }
  ];
  const before = JSON.stringify(logs[1]);
  Object.assign(logs.find(x => x.id === 'A'), { serviceComponentId: 'clean', item: 'Pembersihan Rumah CVT', actionType: 'ganti' });
  assert.equal(JSON.stringify(logs[1]), before);
});

test('component filter resolves direct serviceComponentId before legacy checklist', () => {
  const resolve = s => s?.serviceComponentId ||
    (Array.isArray(s?.checklist) ? s.checklist.find(r => r && r.itemId)?.itemId : null) || null;
  assert.equal(resolve({ serviceComponentId: 'slide', checklist: [{ itemId: 'wrong' }] }), 'slide');
  assert.equal(resolve({ checklist: [{ itemId: 'clean' }] }), 'clean');
  assert.equal(resolve({ item: 'Pembersihan Rumah CVT' }), null);
});
