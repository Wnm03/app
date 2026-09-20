const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const F = require('./helpers/serviceMasterFixture');

test('CATEGORY-SOT-05 source maps every checklist group to canonical masterCategoryId', () => {
  // Checklist groups are projected from the generated Service Master (S1863+).
  const ids = F.masterGroups().map(g => g.masterCategoryId);
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test('CATEGORY-SOT-05 preserves 13 groups and the 50 legacy items inside the 102-item cumulative master', () => {
  const groups = F.masterGroups();
  const items = F.masterItems();
  assert.equal(groups.length, F.MASTER_GROUP_COUNT);
  assert.equal(items.length, F.MASTER_COMPONENT_COUNT);
  for (const id of F.LEGACY_CHECKLIST_IDS) assert.ok(items.some(x => x.id === id), 'legacy item missing: ' + id);
  assert.ok(items.every(x => groups.some(g => g.masterCategoryId === x.masterCategoryId)));
});

test('CATEGORY-SOT-05 canonical lookup does not invent IDs', () => {
  const src = fs.readFileSync(require.resolve('../modules/vehicle/servis-checklist.js'), 'utf8');
  assert.match(src, /function getServiceChecklistMasterCategoryId/);
  assert.match(src, /return hit \? hit\.id : null/);
});
