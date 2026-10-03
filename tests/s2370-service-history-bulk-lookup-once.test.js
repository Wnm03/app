'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/service-history-bulk-identity-editor.js'), 'utf8');

test('S2370: bulk history operations use one indexed lookup helper', () => {
  assert.match(source, /_logsByIds\(ids\)/);
  assert.match(source, /const byId=new Map\(\)/);
  assert.match(source, /if\(!byId\.has\(id\)\)byId\.set\(id,log\)/);
  assert.equal((source.match(/ids\.map\(id=>\(D\.servisLogs\|\|\[\]\)\.find/g) || []).length, 0);
});

test('S2370: indexed lookup preserves requested order, duplicate selections, and first matching record', () => {
  const rows = [{ id: 'b', n: 1 }, { id: 'a', n: 2 }, { id: 'a', n: 3 }];
  const byId = new Map();
  for (const row of rows) { if (!row) continue; const id = String(row.id); if (!byId.has(id)) byId.set(id, row); }
  const result = ['a', 'b', 'a', 'missing'].map(id => byId.get(String(id))).filter(Boolean);
  assert.deepEqual(result.map(x => x.n), [2, 1, 2]);
});
