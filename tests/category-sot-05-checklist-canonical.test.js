const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('CATEGORY-SOT-05 source maps every checklist group to canonical masterCategoryId', () => {
  const src = fs.readFileSync(require.resolve('../modules/vehicle/servis-checklist.js'), 'utf8');
  const ids = [...src.matchAll(/masterCategoryId:\s*'([^']+)'/g)].map(m => m[1]);
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test('CATEGORY-SOT-05 preserves 13 groups and 30 checklist items', () => {
  const src = fs.readFileSync(require.resolve('../modules/vehicle/servis-checklist.js'), 'utf8');
  assert.equal((src.match(/group:\s*'/g) || []).length, 13);
  assert.equal((src.match(/id:\s*'[^']+',\s*name:/g) || []).length, 30);
});

test('CATEGORY-SOT-05 canonical lookup does not invent IDs', () => {
  const src = fs.readFileSync(require.resolve('../modules/vehicle/servis-checklist.js'), 'utf8');
  assert.match(src, /function getServiceChecklistMasterCategoryId/);
  assert.match(src, /return hit \? hit\.id : null/);
});
