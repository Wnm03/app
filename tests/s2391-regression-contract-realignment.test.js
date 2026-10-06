'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('S2391 GROUP_B pin is refreshed to the measured source payload', () => {
  const build = read('scripts/build.js');
  const m = build.match(/const GROUP_B = \[(.*?)\n\];/s);
  assert.ok(m);
  const files = [...m[1].matchAll(/'([^']+\.js)'/g)].map(x => x[1]);
  assert.equal(files.length, 360);
  assert.equal(new Set(files).size, files.length);
  assert.ok(files.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0) > 0);
});

test('S2391 stock lookup retains single-pass vehicle-scoped matching', () => {
  const s = read('modules/vehicle/servis.js');
  assert.match(s, /findMatchingStockByCatalogId\(catalogId,vehicleId\)/);
  assert.match(s, /_scopedCount\+\+;if\(_scopedCount===1\)_singleScoped=p/);
  assert.match(s, /_scopedCount>1\)return _exactScoped\|\|null/);
  assert.match(s, /findMatchingStockByName\(name,vehicleId\)/);
});

test('S2391 idempotency guard uses a Set index before duplicate rejection', () => {
  const s = read('modules/vehicle/servis.js');
  assert.match(s, /const _existingIdempotencyKeys=new Set\(\)/);
  assert.match(s, /_existingIdempotencyKeys\.has/);
  assert.match(s, /Pengerjaan servis yang sama sudah tersimpan/);
});

test('S2391 batch rollback scopes removed logs to the current batch and defers save', () => {
  const s = read('modules/vehicle/servis.js');
  assert.match(s, /_rollbackLog\.batchId===batchId/);
  assert.match(s, /_batchDeferSave:true/);
  assert.ok(s.indexOf("save({domain:'servis',financeMutation:") < s.indexOf('for(const entry of results){'));
});
